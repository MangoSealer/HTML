'use strict';

const BASE = 'https://painel.danilosn.work';
const STORAGE_KEY = 'epub_reader_data';

// ── Theme ─────────────────────────────────────────────────────────────────────

const THEME_VALS = {
  dark:  { bg: '#0f172a', text: '#e5e7eb', heading: '#f1f5f9', link: '#93c5fd',  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  sepia: { bg: '#c8a97a', text: '#1e0f00', heading: '#0e0500', link: '#5c3d1e',  font: "Georgia,'Times New Roman',serif" },
  white: { bg: '#ffffff', text: '#1a1a1a', heading: '#111111', link: '#2563eb',  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
};

function getThemeCss(name) {
  const t = THEME_VALS[name] || THEME_VALS.dark;
  return `
    * { background-color: ${t.bg} !important; color: ${t.text} !important; }
    html, body {
      font-family: ${t.font} !important;
      font-size: ${S.fontSize}% !important;
      line-height: 1.7 !important;
      padding: 1.5em 2em !important;
      margin: 0 !important;
    }
    h1, h2, h3, h4, h5, h6 { color: ${t.heading} !important; }
    a, a:visited, a:active { color: ${t.link} !important; }
    img, svg, canvas, picture { background-color: transparent !important; }
  `;
}

function injectThemeToDoc(doc, name) {
  if (!doc || !doc.head) return;
  let style = doc.getElementById('epub-reader-theme');
  if (!style) {
    style = doc.createElement('style');
    style.id = 'epub-reader-theme';
    doc.head.appendChild(style);
  }
  style.textContent = getThemeCss(name);
}

function injectThemeToAllIframes(name) {
  document.querySelectorAll('#epub-viewer iframe').forEach(iframe => {
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (doc) injectThemeToDoc(doc, name);
    } catch (_) {}
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

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

// ── F11 / resize fix ──────────────────────────────────────────────────────────
// Registered AFTER const S (no TDZ risk) but before any book is opened
// (epub.js registers its handler inside renderTo(), which runs only on openEpub).

window.addEventListener('resize', () => {
  if (!window._epubCfi && S.currentCfi) window._epubCfi = S.currentCfi;
  clearTimeout(window._epubResizeTimer);
  window._epubResizeTimer = setTimeout(() => {
    const cfi = window._epubCfi;
    window._epubCfi = null;
    if (S.rendition && cfi) S.rendition.display(cfi).catch(() => {});
  }, 400);
});

// ── API ───────────────────────────────────────────────────────────────────────

function api(path, opts = {}) {
  return fetch(BASE + path, { credentials: 'include', ...opts }).then(res => {
    if (res.status === 401) {
      sessionStorage.setItem('epub_return', window.location.href);
      window.location.replace('/admin.html');
    }
    return res;
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
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

// ── localStorage ──────────────────────────────────────────────────────────────

function getFileData(filename) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const d = all[filename] || {};
    return { cfi: d.cfi || null, scrollTop: d.scrollTop || 0, progress: d.progress || 0, bookmarks: d.bookmarks || [] };
  } catch (_) { return { cfi: null, scrollTop: 0, progress: 0, bookmarks: [] }; }
}

function saveFileData(filename, data) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[filename] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (_) {}
}

function saveLastRead() {
  if (!S.filename || !S.currentCfi) return;
  const data = getFileData(S.filename);
  const vw = document.getElementById('viewer-wrap');
  data.cfi = S.currentCfi;
  data.scrollTop = vw ? vw.scrollTop : 0;
  data.progress = S.progress;
  saveFileData(S.filename, data);
}

function saveProgressDebounced() {
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(saveLastRead, 1000);
}

// ── List ──────────────────────────────────────────────────────────────────────

async function loadList() {
  try {
    const res = await api('/epub/list');
    if (!res.ok) { showError('Erro ao carregar lista de EPUBs.'); return; }
    S.epubs = await res.json();
    renderList();
  } catch (e) {
    showError('Erro ao carregar lista: ' + (e && e.message ? e.message : 'falha de rede'));
  }
}

function renderList() {
  const el = document.getElementById('epub-list');
  if (!S.epubs.length) {
    el.innerHTML = '<div class="empty-list">Nenhum EPUB salvo ainda.</div>';
    return;
  }
  el.innerHTML = S.epubs.map(itemHTML).join('');
}

function itemHTML(epub) {
  const title = escHtml(epub.title || epub.filename);
  const date = epub.uploaded_at ? new Date(epub.uploaded_at).toLocaleDateString('pt-BR') : '';
  const active = epub.filename === S.filename ? ' active' : '';
  const stored = getFileData(epub.filename);
  const badge = stored.progress ? `<span class="progress-badge">${stored.progress}%</span>` : '';
  return `
    <div class="epub-item${active}" id="item-${escId(epub.filename)}">
      <div class="epub-item-body" onclick="openEpub('${escAttr(epub.filename)}')">
        <div class="epub-item-title">${title}</div>
        <div class="epub-item-meta"><span>${date}</span>${badge}</div>
      </div>
      <div class="epub-item-actions">
        <button class="item-btn" onclick="startRename('${escAttr(epub.filename)}')">✏️ Renomear</button>
        <button class="item-btn del" onclick="deleteEpub('${escAttr(epub.filename)}')">🗑 Deletar</button>
      </div>
    </div>`;
}

// ── Open / Close / Recreate ───────────────────────────────────────────────────

async function openEpub(filename) {
  S.filename = filename;
  document.querySelectorAll('.epub-item').forEach(el => el.classList.remove('active'));
  const itemEl = document.getElementById('item-' + escId(filename));
  if (itemEl) itemEl.classList.add('active');

  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('collapsed');
    document.getElementById('btn-toggle-sidebar').textContent = '▶';
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  }

  document.getElementById('reader-empty').classList.add('hidden');
  document.getElementById('reader-content').classList.remove('hidden');
  document.getElementById('viewer-loading').classList.remove('hidden');

  try {
    const res = await api(`/epub/file/${encodeURIComponent(filename)}`);
    if (!res.ok) { showError('Erro ao baixar o EPUB.'); return; }
    const arrayBuffer = await res.arrayBuffer();

    destroyRendition();
    if (S.book) { try { S.book.destroy(); } catch (_) {} S.book = null; }

    S.book = ePub(arrayBuffer);

    const stored = getFileData(filename);
    await recreateRendition(stored.cfi || undefined);
    await loadToc();
    renderBookmarks();
    syncBookmarks(filename);

    document.getElementById('viewer-loading').classList.add('hidden');

    // Restore exact scroll position within the chapter
    if (stored.scrollTop && stored.cfi) {
      setTimeout(() => {
        const vw = document.getElementById('viewer-wrap');
        if (vw) vw.scrollTop = stored.scrollTop;
      }, 350);
    }
  } catch (e) {
    showError('Erro ao carregar EPUB: ' + e.message);
    document.getElementById('viewer-loading').classList.add('hidden');
  }
}

function closeBook() {
  if (!S.filename) return;
  S.filename = null;
  S.currentCfi = null;
  S.progress = 0;
  destroyRendition();
  if (S.book) { try { S.book.destroy(); } catch (_) {} S.book = null; }
  document.querySelectorAll('.epub-item').forEach(el => el.classList.remove('active'));
  document.getElementById('reader-content').classList.add('hidden');
  document.getElementById('reader-empty').classList.remove('hidden');
  document.getElementById('toc-items').innerHTML = '';
  document.getElementById('toc-empty').style.display = '';
  document.getElementById('bookmarks-list').innerHTML = '';
  document.getElementById('bookmarks-empty').style.display = '';
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('collapsed');
    document.getElementById('btn-toggle-sidebar').textContent = '◀';
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
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

  S.rendition.hooks.content.register(contents => {
    try { injectThemeToDoc(contents.document, S.theme); } catch (_) {}
  });

  S.rendition.on('relocated', location => {
    S.currentCfi = location.start.cfi;
    S.progress = calcProgress(location);
    updateReaderUI(location);
    highlightTocItem(location.start.href);
    saveProgressDebounced();
    updateBookmarkButton();
  });

  await S.rendition.display(cfi || undefined);

  setTimeout(() => injectThemeToAllIframes(S.theme), 100);

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
  document.getElementById('reader-info').textContent = `Cap. ${spineIdx}/${spineLen} · ${S.progress}%`;
  document.getElementById('btn-prev').disabled = !!location.atStart;
  document.getElementById('btn-next').disabled = !!location.atEnd;
  document.getElementById('font-label').textContent = S.fontSize + '%';
}

// ── TOC ───────────────────────────────────────────────────────────────────────

async function loadToc() {
  try {
    const nav = await S.book.loaded.navigation;
    const toc = (nav && nav.toc) ? nav.toc : [];
    const tocItemsEl = document.getElementById('toc-items');
    const tocEmptyEl = document.getElementById('toc-empty');
    if (!toc.length) { tocItemsEl.innerHTML = ''; tocEmptyEl.style.display = ''; return; }
    tocEmptyEl.style.display = 'none';
    tocItemsEl.innerHTML = renderTocItems(toc, 0);
  } catch (_) {}
}

function renderTocItems(items, depth) {
  return items.map(item => {
    const label = escHtml((item.label || '').trim());
    const href = escAttr(item.href || '');
    const sub = item.subitems && item.subitems.length ? renderTocItems(item.subitems, depth + 1) : '';
    return `<div class="toc-item" style="padding-left:${12 + depth * 14}px" data-href="${href}" onclick="navigateTo('${href}')">${label}</div>${sub}`;
  }).join('');
}

function navigateTo(href) {
  if (!S.rendition || !href) return;
  S.rendition.display(href);
}

function navigateToCfi(cfi, scrollTop) {
  if (!S.rendition || !cfi) return;
  S.rendition.display(cfi)
    .then(() => {
      if (scrollTop) {
        setTimeout(() => {
          const vw = document.getElementById('viewer-wrap');
          if (vw) vw.scrollTop = scrollTop;
        }, 200);
      }
    })
    .catch(() => {});
}

function highlightTocItem(currentHref) {
  if (!currentHref) return;
  const base = currentHref.split('#')[0];
  document.querySelectorAll('.toc-item').forEach(el => {
    const h = el.dataset.href || '';
    el.classList.toggle('active', h === currentHref || h.split('#')[0] === base);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────

function changePage(delta) {
  if (!S.rendition) return;
  if (delta > 0) S.rendition.next();
  else S.rendition.prev();
}

// ── Font size ─────────────────────────────────────────────────────────────────

function changeFontSize(delta) {
  const next = S.fontSize + delta;
  if (next < 60 || next > 200) return;
  S.fontSize = next;
  injectThemeToAllIframes(S.theme);
  document.getElementById('font-label').textContent = S.fontSize + '%';
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function setTheme(name) {
  S.theme = name;
  document.documentElement.setAttribute('data-theme', name);
  injectThemeToAllIframes(name);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function showTab(tab) {
  document.getElementById('epub-list').classList.toggle('hidden', tab !== 'books');
  document.getElementById('toc-list').classList.toggle('hidden', tab !== 'toc');
  document.getElementById('bookmarks-content').classList.toggle('hidden', tab !== 'bookmarks');
  ['books', 'toc', 'bookmarks'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (tab !== 'books') document.getElementById('upload-zone').classList.remove('open');
  if (tab === 'bookmarks') renderBookmarks();
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
// In scrolled mode, location.start.cfi is the section/chapter-level CFI.
// scrollTop tracks the exact pixel position within that chapter.

function viewerScrollTop() {
  const vw = document.getElementById('viewer-wrap');
  return vw ? vw.scrollTop : 0;
}

async function toggleBookmark() {
  if (!S.currentCfi || !S.filename) return;
  const data = getFileData(S.filename);
  const cfi = S.currentCfi;
  const scrollTop = viewerScrollTop();

  // Remove if there's a bookmark within 80px of the current scroll position
  const idx = data.bookmarks.findIndex(b => b.cfi === cfi && Math.abs((b.scrollTop || 0) - scrollTop) < 80);
  if (idx >= 0) {
    const bm = data.bookmarks.splice(idx, 1)[0];
    saveFileData(S.filename, data);
    updateBookmarkButton();
    renderBookmarks();
    if (bm.id) deleteServerBookmark(S.filename, bm.id);
  } else {
    const activeToc = document.querySelector('.toc-item.active');
    const label = activeToc ? activeToc.textContent.trim() : (document.getElementById('reader-info').textContent || 'Posição atual');
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const bm = { id: genBookmarkId(), cfi, scrollTop, label, date };
    data.bookmarks.push(bm);
    saveFileData(S.filename, data);
    updateBookmarkButton();
    renderBookmarks();
    pushBookmark(S.filename, bm);
  }
}

function updateBookmarkButton() {
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;
  if (!S.filename || !S.currentCfi) { btn.classList.remove('bookmarked'); return; }
  const data = getFileData(S.filename);
  const scrollTop = viewerScrollTop();
  const isBookmarked = data.bookmarks.some(
    b => b.cfi === S.currentCfi && Math.abs((b.scrollTop || 0) - scrollTop) < 80
  );
  btn.classList.toggle('bookmarked', isBookmarked);
}

function renderBookmarks() {
  const emptyEl = document.getElementById('bookmarks-empty');
  const listEl = document.getElementById('bookmarks-list');
  if (!S.filename) { emptyEl.style.display = ''; listEl.innerHTML = ''; return; }
  const bms = getFileData(S.filename).bookmarks || [];
  if (!bms.length) { emptyEl.style.display = ''; listEl.innerHTML = ''; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = bms.map((b, i) => `
    <div class="bookmark-item" onclick="navigateToCfi('${escAttr(b.cfi)}',${b.scrollTop || 0})">
      <div class="bookmark-label">${escHtml(b.label)}</div>
      <div class="bookmark-meta">${escHtml(b.date)}</div>
      <button class="bookmark-del" onclick="removeBookmark(event,${i})" title="Remover">✕</button>
    </div>`).join('');
}

function removeBookmark(e, index) {
  e.stopPropagation();
  if (!S.filename) return;
  const data = getFileData(S.filename);
  const bm = data.bookmarks.splice(index, 1)[0];
  saveFileData(S.filename, data);
  updateBookmarkButton();
  renderBookmarks();
  if (bm && bm.id) deleteServerBookmark(S.filename, bm.id);
}

// ── Bookmark server sync ──────────────────────────────────────────────────────

function genBookmarkId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function syncBookmarks(filename) {
  try {
    const res = await api(`/epub/bookmarks/${encodeURIComponent(filename)}`);
    if (!res.ok) { showError(`Sync de marcadores falhou (${res.status})`); return; }
    const serverBms = await res.json();
    const data = getFileData(filename);
    data.bookmarks = serverBms;
    saveFileData(filename, data);
    renderBookmarks();
    updateBookmarkButton();
  } catch (e) { showError('Sync de marcadores: ' + (e && e.message ? e.message : 'falha de rede')); }
}

async function pushBookmark(filename, bm) {
  try {
    const res = await api(`/epub/bookmarks/${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bm),
    });
    if (!res.ok) showError(`Erro ao salvar marcador (${res.status})`);
  } catch (e) { showError('Erro ao salvar marcador: ' + (e && e.message ? e.message : 'falha de rede')); }
}

async function deleteServerBookmark(filename, id) {
  try {
    await api(`/epub/bookmarks/${encodeURIComponent(filename)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (_) {}
}

// ── Upload ────────────────────────────────────────────────────────────────────

function toggleUpload() {
  document.getElementById('upload-zone').classList.toggle('open');
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadFile(file);
  e.target.value = '';
}

async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith('.epub')) { showError('Apenas arquivos .epub são aceitos.'); return; }
  const btn = document.querySelector('.sidebar-header .btn-primary');
  const orig = btn.textContent;
  btn.textContent = 'Enviando…';
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/epub/upload', { method: 'POST', body: fd });
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

const dropArea = document.getElementById('drop-area');
dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// ── Rename ────────────────────────────────────────────────────────────────────

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

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteEpub(filename) {
  const epub = S.epubs.find(e => e.filename === filename);
  const label = epub ? (epub.title || epub.filename) : filename;
  if (!confirm(`Deletar "${label}"?`)) return;
  try {
    const res = await api(`/epub/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (!res.ok) { showError('Erro ao deletar.'); return; }
    S.epubs = S.epubs.filter(e => e.filename !== filename);
    if (S.filename === filename) closeBook();
    renderList();
  } catch (e) {
    showError('Falha ao deletar: ' + e.message);
  }
}

// ── Toggle UI ─────────────────────────────────────────────────────────────────

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('btn-toggle-sidebar');
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  btn.textContent = isCollapsed ? '▶' : '◀';

  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.toggle('visible', !isCollapsed);

  if (window.innerWidth > 768 && S.rendition) {
    // Save CFI NOW, before resize() triggers relocated with chapter start
    const cfi = S.currentCfi;
    const scrollTop = viewerScrollTop();
    setTimeout(() => {
      S.rendition.resize();
      if (cfi) setTimeout(() => {
        S.rendition.display(cfi)
          .then(() => {
            if (scrollTop) {
              setTimeout(() => {
                const vw = document.getElementById('viewer-wrap');
                if (vw) vw.scrollTop = scrollTop;
              }, 100);
            }
          })
          .catch(() => {});
      }, 100);
    }, 280);
  }
}

function toggleReaderBar() {
  const bar = document.querySelector('.reader-bar');
  const btn = document.getElementById('btn-toggle-bar');
  bar.classList.toggle('collapsed');
  btn.textContent = bar.classList.contains('collapsed') ? '▼' : '▲';
  if (S.rendition) {
    const cfi = S.currentCfi;
    const scrollTop = viewerScrollTop();
    setTimeout(() => {
      S.rendition.resize();
      if (cfi) setTimeout(() => {
        S.rendition.display(cfi)
          .then(() => {
            if (scrollTop) {
              setTimeout(() => {
                const vw = document.getElementById('viewer-wrap');
                if (vw) vw.scrollTop = scrollTop;
              }, 100);
            }
          })
          .catch(() => {});
      }, 100);
    }, 230);
  }
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); changePage(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); changePage(1); }
});

// ── Scroll listener for bookmark button state ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  let _scrollTimer = null;
  document.getElementById('viewer-wrap').addEventListener('scroll', () => {
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(updateBookmarkButton, 150);
  });
  loadList();
});
