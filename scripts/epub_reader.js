'use strict';

const BASE = 'https://painel.danilosn.work';

const S = {
  epubs: [],
  filename: null,
  book: null,
  rendition: null,
  currentCfi: null,
  progress: 0,
  fontSize: 100,
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
    const res = await api('/epub/list');
    if (res.status === 401) { showError('Não autorizado (401). Verifique o login no painel.'); return; }
    if (!res.ok) { showError('Erro ao carregar lista de EPUBs.'); return; }
    S.epubs = await res.json();
    renderList();
  } catch (e) {
    showError('Falha de rede ao carregar lista.');
  }
}

function renderList() {
  const el = document.getElementById('epub-list');
  if (!S.epubs.length) {
    el.innerHTML = '<div class="empty-list">Nenhum EPUB salvo ainda.</div>';
    return;
  }
  el.innerHTML = S.epubs.map(epub => itemHTML(epub)).join('');
}

function itemHTML(epub) {
  const title = escHtml(epub.title || epub.filename);
  const date = epub.uploaded_at
    ? new Date(epub.uploaded_at).toLocaleDateString('pt-BR')
    : '';
  const active = epub.filename === S.filename ? ' active' : '';
  const badge = epub.progress
    ? `<span class="progress-badge">${epub.progress}%</span>`
    : '';
  return `
    <div class="epub-item${active}" id="item-${escId(epub.filename)}">
      <div class="epub-item-body" onclick="openEpub('${escAttr(epub.filename)}', '${escAttr(epub.cfi || '')}')">
        <div class="epub-item-title">${title}</div>
        <div class="epub-item-meta">
          <span>${date}</span>
          ${badge}
        </div>
      </div>
      <div class="epub-item-actions">
        <button class="item-btn" onclick="startRename('${escAttr(epub.filename)}')" title="Renomear">✏️ Renomear</button>
        <button class="item-btn del" onclick="deleteEpub('${escAttr(epub.filename)}')" title="Deletar">🗑 Deletar</button>
      </div>
    </div>`;
}

// ── Open / Render ─────────────────────────────────────────────────

async function openEpub(filename, savedCfi) {
  S.filename = filename;
  document.querySelectorAll('.epub-item').forEach(el => el.classList.remove('active'));
  const itemEl = document.getElementById('item-' + escId(filename));
  if (itemEl) itemEl.classList.add('active');

  document.getElementById('reader-empty').classList.add('hidden');
  document.getElementById('reader-content').classList.remove('hidden');
  document.getElementById('viewer-wrap').classList.add('hidden');
  document.getElementById('viewer-loading').classList.remove('hidden');

  try {
    const res = await api(`/epub/file/${encodeURIComponent(filename)}`);
    if (res.status === 401) { showError('Não autorizado (401).'); return; }
    if (!res.ok) { showError('Erro ao baixar o EPUB.'); return; }
    const arrayBuffer = await res.arrayBuffer();

    // Destroy previous book
    if (S.rendition) {
      try { S.rendition.destroy(); } catch (_) {}
      S.rendition = null;
    }
    if (S.book) {
      try { S.book.destroy(); } catch (_) {}
      S.book = null;
    }

    // Reset viewer element
    const viewerEl = document.getElementById('epub-viewer');
    viewerEl.innerHTML = '';

    S.book = ePub(arrayBuffer);

    S.rendition = S.book.renderTo('epub-viewer', {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
    });

    applyTheme();

    S.rendition.on('relocated', location => {
      S.currentCfi = location.start.cfi;
      S.progress = Math.round(location.start.percentage * 100);
      updateReaderUI(location);
      saveProgressDebounced();
    });

    await S.rendition.display(savedCfi || undefined);

    document.getElementById('viewer-loading').classList.add('hidden');
    document.getElementById('viewer-wrap').classList.remove('hidden');
  } catch (e) {
    showError('Erro ao carregar EPUB: ' + e.message);
    document.getElementById('viewer-loading').classList.add('hidden');
  }
}

function applyTheme() {
  if (!S.rendition) return;
  S.rendition.themes.register('dark', {
    body: {
      background: '#0f172a !important',
      color: '#e5e7eb !important',
      'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important",
      padding: '2em !important',
      'line-height': '1.7 !important',
    },
    'h1, h2, h3, h4, h5, h6': { color: '#f1f5f9 !important' },
    a: { color: '#93c5fd !important' },
    'p, li': { color: '#e5e7eb !important' },
  });
  S.rendition.themes.select('dark');
  S.rendition.themes.fontSize(S.fontSize + '%');
}

function updateReaderUI(location) {
  const spineLen = S.book && S.book.spine ? S.book.spine.items.length : '?';
  const spineIdx = location.start.index + 1;
  document.getElementById('reader-info').textContent =
    `Cap. ${spineIdx}/${spineLen} · ${S.progress}%`;
  document.getElementById('btn-prev').disabled = !!location.atStart;
  document.getElementById('btn-next').disabled = !!location.atEnd;
  document.getElementById('font-label').textContent = S.fontSize + '%';
}

// ── Navigation ────────────────────────────────────────────────────

function changePage(delta) {
  if (!S.rendition) return;
  if (delta > 0) S.rendition.next();
  else S.rendition.prev();
}

// ── Font size ─────────────────────────────────────────────────────

function changeFontSize(delta) {
  const next = S.fontSize + delta;
  if (next < 60 || next > 200) return;
  S.fontSize = next;
  if (S.rendition) S.rendition.themes.fontSize(S.fontSize + '%');
  document.getElementById('font-label').textContent = S.fontSize + '%';
}

// ── Progress ──────────────────────────────────────────────────────

function saveProgressDebounced() {
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(async () => {
    if (!S.filename || !S.currentCfi) return;
    try {
      await api(`/epub/progress/${encodeURIComponent(S.filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cfi: S.currentCfi, progress: S.progress }),
      });
      const epub = S.epubs.find(e => e.filename === S.filename);
      if (epub) { epub.cfi = S.currentCfi; epub.progress = S.progress; }
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
  if (!file.name.toLowerCase().endsWith('.epub')) {
    showError('Apenas arquivos .epub são aceitos.');
    return;
  }
  const btn = document.querySelector('.sidebar-header .btn-primary');
  const orig = btn.textContent;
  btn.textContent = 'Enviando…';
  btn.disabled = true;

  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/epub/upload', { method: 'POST', body: fd });
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
  const titleEl = itemEl.querySelector('.epub-item-title');
  const epub = S.epubs.find(e => e.filename === filename);
  const current = epub ? (epub.title || epub.filename) : filename;

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
      const res = await api(`/epub/rename/${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.status === 401) { showError('Não autorizado (401).'); input.replaceWith(makeTitleSpan(current)); return; }
      if (!res.ok) { showError('Erro ao renomear.'); input.replaceWith(makeTitleSpan(current)); return; }
      if (epub) epub.title = newTitle;
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
  span.className = 'epub-item-title';
  span.textContent = text;
  return span;
}

// ── Delete ────────────────────────────────────────────────────────

async function deleteEpub(filename) {
  const epub = S.epubs.find(e => e.filename === filename);
  const label = epub ? (epub.title || epub.filename) : filename;
  if (!confirm(`Deletar "${label}"?`)) return;

  try {
    const res = await api(`/epub/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.status === 401) { showError('Não autorizado (401).'); return; }
    if (!res.ok) { showError('Erro ao deletar.'); return; }
    S.epubs = S.epubs.filter(e => e.filename !== filename);
    if (S.filename === filename) {
      S.filename = null;
      if (S.rendition) { try { S.rendition.destroy(); } catch (_) {} S.rendition = null; }
      if (S.book) { try { S.book.destroy(); } catch (_) {} S.book = null; }
      document.getElementById('reader-content').classList.add('hidden');
      document.getElementById('reader-empty').classList.remove('hidden');
    }
    renderList();
  } catch (e) {
    showError('Falha ao deletar: ' + e.message);
  }
}

// ── Toggle UI ─────────────────────────────────────────────────────

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('btn-toggle-sidebar');
  sidebar.classList.toggle('collapsed');
  btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

function toggleReaderBar() {
  const bar = document.querySelector('.reader-bar');
  const btn = document.getElementById('btn-toggle-bar');
  bar.classList.toggle('collapsed');
  btn.textContent = bar.classList.contains('collapsed') ? '▼' : '▲';
}

// ── Keyboard navigation ───────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); changePage(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); changePage(1); }
});

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
