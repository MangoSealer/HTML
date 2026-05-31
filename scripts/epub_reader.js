'use strict';

const BASE = 'https://painel.danilosn.work';

const IFRAME_THEMES = {
  dark: {
    body: {
      'background-color': '#0f172a !important',
      color: '#e5e7eb !important',
      'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important",
      padding: '2em !important',
      'line-height': '1.7 !important',
    },
    'h1, h2, h3, h4, h5, h6': { color: '#f1f5f9 !important' },
    a: { color: '#93c5fd !important' },
    'p, li, td, th': { color: '#e5e7eb !important' },
  },
  sepia: {
    body: {
      'background-color': '#c8a97a !important',
      color: '#1e0f00 !important',
      "font-family": "Georgia, 'Times New Roman', serif !important",
      padding: '2em !important',
      'line-height': '1.7 !important',
    },
    'h1, h2, h3, h4, h5, h6': { color: '#0e0500 !important' },
    a: { color: '#5c3d1e !important' },
    'p, li, td, th': { color: '#1e0f00 !important' },
  },
  white: {
    body: {
      'background-color': '#ffffff !important',
      color: '#1a1a1a !important',
      'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important",
      padding: '2em !important',
      'line-height': '1.7 !important',
    },
    'h1, h2, h3, h4, h5, h6': { color: '#111111 !important' },
    a: { color: '#2563eb !important' },
    'p, li, td, th': { color: '#1a1a1a !important' },
  },
};

const S = {
  epubs: [],
  filename: null,
  book: null,
  rendition: null,
  currentCfi: null,
  progress: 0,
  fontSize: 100,
  theme: 'dark',
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
        <button class="item-btn" onclick="startRename('${escAttr(epub.filename)}')">✏️ Renomear</button>
        <button class="item-btn del" onclick="deleteEpub('${escAttr(epub.filename)}')">🗑 Deletar</button>
      </div>
    </div>`;
}

// ── Open / Recreate ───────────────────────────────────────────────

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

    destroyRendition();
    if (S.book) { try { S.book.destroy(); } catch (_) {} S.book = null; }

    S.book = ePub(arrayBuffer);

    await recreateRendition(savedCfi || undefined);
    await loadToc();

    document.getElementById('viewer-loading').classList.add('hidden');
    document.getElementById('viewer-wrap').classList.remove('hidden');
  } catch (e) {
    showError('Erro ao carregar EPUB: ' + e.message);
    document.getElementById('viewer-loading').classList.add('hidden');
  }
}

function destroyRendition() {
  if (S.rendition) {
    try { S.rendition.destroy(); } catch (_) {}
    S.rendition = null;
  }
  document.getElementById('epub-viewer').innerHTML = '';
}

async function recreateRendition(cfi) {
  destroyRendition();

  document.getElementById('viewer-wrap').classList.add('scrolled');

  S.rendition = S.book.renderTo('epub-viewer', { width: '100%', flow: 'scrolled', spread: 'none' });

  Object.entries(IFRAME_THEMES).forEach(([name, styles]) => {
    S.rendition.themes.register(name, styles);
  });
  S.rendition.themes.select(S.theme);
  S.rendition.themes.fontSize(S.fontSize + '%');

  S.rendition.on('relocated', location => {
    S.currentCfi = location.start.cfi;
    S.progress = calcProgress(location);
    updateReaderUI(location);
    highlightTocItem(location.start.href);
    saveProgressDebounced();
  });

  await S.rendition.display(cfi || undefined);

  // Generate locations in background for accurate percentage
  S.book.ready
    .then(() => S.book.locations.generate(1024))
    .then(() => {
      if (!S.currentCfi || !S.book) return;
      try {
        const pct = S.book.locations.percentageFromCfi(S.currentCfi);
        if (typeof pct === 'number' && !isNaN(pct)) {
          S.progress = Math.round(pct * 100);
          const el = document.getElementById('reader-info');
          if (el) el.textContent = el.textContent.replace(/\d+%/, S.progress + '%');
        }
      } catch (_) {}
    })
    .catch(() => {});
}

function calcProgress(location) {
  // Use book.locations if generated, else approximate via spine position
  if (S.book && S.book.locations && S.book.locations.total > 0) {
    try {
      const pct = S.book.locations.percentageFromCfi(location.start.cfi);
      if (typeof pct === 'number' && !isNaN(pct)) return Math.round(pct * 100);
    } catch (_) {}
  }
  const idx = location.start.index || 0;
  const total = (S.book && S.book.spine && S.book.spine.items.length) || 1;
  return Math.round((idx / Math.max(total - 1, 1)) * 100);
}

function updateReaderUI(location) {
  const spineLen = S.book && S.book.spine ? S.book.spine.items.length : '?';
  const spineIdx = (location.start.index || 0) + 1;
  document.getElementById('reader-info').textContent =
    `Cap. ${spineIdx}/${spineLen} · ${S.progress}%`;
  document.getElementById('btn-prev').disabled = !!location.atStart;
  document.getElementById('btn-next').disabled = !!location.atEnd;
  document.getElementById('font-label').textContent = S.fontSize + '%';
}

// ── TOC ──────────────────────────────────────────────────────────

async function loadToc() {
  try {
    const nav = await S.book.loaded.navigation;
    const toc = (nav && nav.toc) ? nav.toc : [];
    const tocItemsEl = document.getElementById('toc-items');
    const tocEmptyEl = document.getElementById('toc-empty');
    if (!toc.length) {
      tocItemsEl.innerHTML = '';
      tocEmptyEl.style.display = '';
      return;
    }
    tocEmptyEl.style.display = 'none';
    tocItemsEl.innerHTML = renderTocItems(toc, 0);
  } catch (_) {}
}

function renderTocItems(items, depth) {
  return items.map(item => {
    const label = escHtml((item.label || '').trim());
    const href = escAttr(item.href || '');
    const sub = item.subitems && item.subitems.length
      ? renderTocItems(item.subitems, depth + 1)
      : '';
    return `<div class="toc-item" style="padding-left:${12 + depth * 14}px" data-href="${href}" onclick="navigateTo('${href}')">${label}</div>${sub}`;
  }).join('');
}

function navigateTo(href) {
  if (!S.rendition || !href) return;
  S.rendition.display(href);
}

function highlightTocItem(currentHref) {
  if (!currentHref) return;
  const base = currentHref.split('#')[0];
  document.querySelectorAll('.toc-item').forEach(el => {
    const h = el.dataset.href || '';
    el.classList.toggle('active', h === currentHref || h.split('#')[0] === base);
  });
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

// ── Theme ─────────────────────────────────────────────────────────

function setTheme(name) {
  S.theme = name;
  document.documentElement.setAttribute('data-theme', name);
  if (S.rendition) S.rendition.themes.select(name);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
}

// ── Tabs ──────────────────────────────────────────────────────────

function showTab(tab) {
  const isBooks = tab === 'books';
  document.getElementById('epub-list').classList.toggle('hidden', !isBooks);
  document.getElementById('toc-list').classList.toggle('hidden', isBooks);
  document.getElementById('tab-books').classList.toggle('active', isBooks);
  document.getElementById('tab-toc').classList.toggle('active', !isBooks);
  if (!isBooks) document.getElementById('upload-zone').classList.remove('open');
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
    } catch (_) {}
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
    if (!res.ok) { showError('Erro no upload: ' + await res.text()); return; }
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
dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
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
    if (!newTitle || newTitle === current) { input.replaceWith(makeTitleSpan(current)); return; }
    try {
      const res = await api(`/epub/rename/${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
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
  const div = document.createElement('div');
  div.className = 'epub-item-title';
  div.textContent = text;
  return div;
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
      destroyRendition();
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
  // Fix: resize rendition after CSS transition completes
  if (S.rendition) setTimeout(() => S.rendition.resize(), 280);
}

function toggleReaderBar() {
  const bar = document.querySelector('.reader-bar');
  const btn = document.getElementById('btn-toggle-bar');
  bar.classList.toggle('collapsed');
  btn.textContent = bar.classList.contains('collapsed') ? '▼' : '▲';
  if (S.rendition) setTimeout(() => S.rendition.resize(), 230);
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ── Init ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadList);
