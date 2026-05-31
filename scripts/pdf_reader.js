'use strict';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const BASE = 'https://painel.danilosn.work';

const S = {
  pdfs: [],
  filename: null,
  doc: null,
  page: 1,
  total: 0,
  scale: 1.2,
  renderTask: null,
  saveTimer: null,
};

// ── API helpers ──────────────────────────────────────────────────

function api(path, opts = {}) {
  return fetch(BASE + path, { credentials: 'include', ...opts });
}

function showError(msg) {
  let el = document.getElementById('error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-banner';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350); }, 5000);
}

// ── List ─────────────────────────────────────────────────────────

async function loadList() {
  try {
    const res = await api('/pdf/list');
    if (res.status === 401) { showError('Não autorizado (401). Verifique o login no painel.'); return; }
    if (!res.ok) { showError('Erro ao carregar lista de PDFs.'); return; }
    S.pdfs = await res.json();
    renderList();
  } catch (e) {
    showError('Falha de rede ao carregar lista.');
  }
}

function renderList() {
  const el = document.getElementById('pdf-list');
  if (!S.pdfs.length) {
    el.innerHTML = '<div class="empty-list">Nenhum PDF salvo ainda.</div>';
    return;
  }
  el.innerHTML = S.pdfs.map(pdf => itemHTML(pdf)).join('');
}

function itemHTML(pdf) {
  const title = escHtml(pdf.title || pdf.filename);
  const date = pdf.uploaded_at
    ? new Date(pdf.uploaded_at).toLocaleDateString('pt-BR')
    : '';
  const active = pdf.filename === S.filename ? ' active' : '';
  return `
    <div class="pdf-item${active}" id="item-${escId(pdf.filename)}">
      <div class="pdf-item-body" onclick="openPdf('${escAttr(pdf.filename)}', ${pdf.page || 1})">
        <div class="pdf-item-title">${title}</div>
        <div class="pdf-item-meta">
          <span>${date}</span>
          ${pdf.page ? `<span class="page-badge">p. ${pdf.page}</span>` : ''}
        </div>
      </div>
      <div class="pdf-item-actions">
        <button class="item-btn" onclick="startRename('${escAttr(pdf.filename)}')" title="Renomear">✏️ Renomear</button>
        <button class="item-btn del" onclick="deletePdf('${escAttr(pdf.filename)}')" title="Deletar">🗑 Deletar</button>
      </div>
    </div>`;
}

// ── Open / Render ─────────────────────────────────────────────────

async function openPdf(filename, startPage) {
  S.filename = filename;
  document.querySelectorAll('.pdf-item').forEach(el => el.classList.remove('active'));
  const itemEl = document.getElementById('item-' + escId(filename));
  if (itemEl) itemEl.classList.add('active');

  document.getElementById('reader-empty').classList.add('hidden');
  document.getElementById('reader-content').classList.remove('hidden');
  document.getElementById('canvas-wrap').classList.add('hidden');
  document.getElementById('canvas-loading').classList.remove('hidden');

  try {
    const res = await api(`/pdf/file/${encodeURIComponent(filename)}`);
    if (res.status === 401) { showError('Não autorizado (401).'); return; }
    if (!res.ok) { showError('Erro ao baixar o PDF.'); return; }
    const arrayBuffer = await res.arrayBuffer();

    if (S.renderTask) {
      try { S.renderTask.cancel(); } catch (_) {}
      S.renderTask = null;
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    S.doc = await loadingTask.promise;
    S.total = S.doc.numPages;
    S.page = Math.min(Math.max(1, startPage || 1), S.total);

    document.getElementById('canvas-loading').classList.add('hidden');
    document.getElementById('canvas-wrap').classList.remove('hidden');

    await renderPage(S.page);
  } catch (e) {
    showError('Erro ao carregar PDF: ' + e.message);
    document.getElementById('canvas-loading').classList.add('hidden');
  }
}

async function renderPage(n) {
  if (!S.doc) return;

  if (S.renderTask) {
    try { S.renderTask.cancel(); } catch (_) {}
    S.renderTask = null;
  }

  S.page = n;

  const page = await S.doc.getPage(n);
  const viewport = page.getViewport({ scale: S.scale });
  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const task = page.render({ canvasContext: ctx, viewport });
  S.renderTask = task;

  try {
    await task.promise;
  } catch (e) {
    if (e.name !== 'RenderingCancelledException') throw e;
    return;
  }
  S.renderTask = null;

  updateReaderUI();
  saveProgressDebounced();
}

function updateReaderUI() {
  document.getElementById('page-input').value = S.page;
  document.getElementById('page-info').textContent = `de ${S.total}`;
  document.getElementById('btn-prev').disabled = S.page <= 1;
  document.getElementById('btn-next').disabled = S.page >= S.total;
  document.getElementById('zoom-label').textContent = Math.round(S.scale * 100) + '%';
}

// ── Navigation ────────────────────────────────────────────────────

function changePage(delta) {
  const n = S.page + delta;
  if (n < 1 || n > S.total) return;
  renderPage(n);
}

function handlePageKey(e) {
  if (e.key === 'Enter') e.target.blur();
}

function handlePageBlur() {
  const input = document.getElementById('page-input');
  const n = parseInt(input.value, 10);
  if (!isNaN(n) && n >= 1 && n <= S.total && n !== S.page) {
    renderPage(n);
  } else {
    input.value = S.page;
  }
}

// ── Zoom ──────────────────────────────────────────────────────────

function changeZoom(delta) {
  const next = Math.round((S.scale + delta) * 10) / 10;
  if (next < 0.4 || next > 4.0) return;
  S.scale = next;
  if (S.doc) renderPage(S.page);
}

// ── Progress ──────────────────────────────────────────────────────

function saveProgressDebounced() {
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(async () => {
    if (!S.filename) return;
    try {
      await api(`/pdf/progress/${encodeURIComponent(S.filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: S.page }),
      });
      const pdf = S.pdfs.find(p => p.filename === S.filename);
      if (pdf) pdf.page = S.page;
    } catch (_) { /* silent */ }
  }, 1000);
}

// ── Upload ────────────────────────────────────────────────────────

function toggleUpload() {
  document.getElementById('upload-zone').classList.toggle('open');
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadFile(file);
  e.target.value = '';
}

async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showError('Apenas arquivos .pdf são aceitos.');
    return;
  }
  const btn = document.querySelector('.sidebar-header .btn-primary');
  const orig = btn.textContent;
  btn.textContent = 'Enviando…';
  btn.disabled = true;

  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/pdf/upload', { method: 'POST', body: fd });
    if (res.status === 401) { showError('Não autorizado (401).'); return; }
    if (!res.ok) {
      const txt = await res.text();
      showError('Erro no upload: ' + txt);
      return;
    }
    document.getElementById('upload-zone').classList.remove('open');
    await loadList();
  } catch (e) {
    showError('Falha no upload: ' + e.message);
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}

// Drag-and-drop
const dropArea = document.getElementById('drop-area');
dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.classList.add('drag-over');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// ── Rename ────────────────────────────────────────────────────────

function startRename(filename) {
  const itemEl = document.getElementById('item-' + escId(filename));
  if (!itemEl) return;
  const titleEl = itemEl.querySelector('.pdf-item-title');
  const pdf = S.pdfs.find(p => p.filename === filename);
  const current = pdf ? (pdf.title || pdf.filename) : filename;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = current;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;

  async function save() {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === current) {
      input.replaceWith(makeTitleSpan(current));
      return;
    }
    try {
      const res = await api(`/pdf/rename/${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.status === 401) { showError('Não autorizado (401).'); input.replaceWith(makeTitleSpan(current)); return; }
      if (!res.ok) { showError('Erro ao renomear.'); input.replaceWith(makeTitleSpan(current)); return; }
      if (pdf) pdf.title = newTitle;
      input.replaceWith(makeTitleSpan(newTitle));
    } catch (e) {
      showError('Falha ao renomear: ' + e.message);
      input.replaceWith(makeTitleSpan(current));
    }
  }

  function cancel() {
    if (saved) return;
    saved = true;
    input.replaceWith(makeTitleSpan(current));
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', save);
}

function makeTitleSpan(text) {
  const span = document.createElement('div');
  span.className = 'pdf-item-title';
  span.textContent = text;
  return span;
}

// ── Delete ────────────────────────────────────────────────────────

async function deletePdf(filename) {
  const pdf = S.pdfs.find(p => p.filename === filename);
  const label = pdf ? (pdf.title || pdf.filename) : filename;
  if (!confirm(`Deletar "${label}"?`)) return;

  try {
    const res = await api(`/pdf/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.status === 401) { showError('Não autorizado (401).'); return; }
    if (!res.ok) { showError('Erro ao deletar.'); return; }
    S.pdfs = S.pdfs.filter(p => p.filename !== filename);
    if (S.filename === filename) {
      S.filename = null;
      S.doc = null;
      document.getElementById('reader-content').classList.add('hidden');
      document.getElementById('reader-empty').classList.remove('hidden');
    }
    renderList();
  } catch (e) {
    showError('Falha ao deletar: ' + e.message);
  }
}

// ── Utils ─────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ── Init ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadList);
