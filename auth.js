(function () {
  document.documentElement.style.visibility = 'hidden';

  fetch('https://api.danilosn.work/me', { credentials: 'include' })
    .then(function (res) {
      if (res.status === 401) {
        window.location.replace('/login.html');
        return;
      }
      document.documentElement.style.visibility = '';
      injectLogoutStyle();
      addLogoutButton();
    })
    .catch(function () {
      window.location.replace('/login.html');
    });

  // Estilo do botão de logout. Usa as variáveis de cores.css quando a página
  // as carrega, com fallback embutido para páginas que não importam cores.css
  // (epub, pdf, jogos, etc.). O cookie de sessão (`session`, httpOnly) é
  // apagado pelo backend em POST /logout — não há remoção client-side.
  function injectLogoutStyle() {
    if (document.getElementById('logout-btn-style')) return;
    var style = document.createElement('style');
    style.id = 'logout-btn-style';
    style.textContent =
      '.logout-btn{' +
        'position:fixed;top:12px;right:12px;z-index:9999;' +
        'padding:6px 14px;background:transparent;' +
        'color:var(--text-muted,#9ca3af);' +
        'border:1px solid var(--border,#263244);' +
        'border-radius:var(--radius-sm,10px);' +
        'cursor:pointer;font-size:13px;font-family:inherit;' +
        'transition:color 0.15s,border-color 0.15s,background 0.15s;' +
      '}' +
      '.logout-btn:hover{' +
        'color:var(--text,#e5e7eb);' +
        'border-color:var(--danger,#dc2626);' +
        'background:rgba(220,38,38,0.08);' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  function addLogoutButton() {
    function inject() {
      if (!document.body) return;
      var btn = document.createElement('button');
      btn.className = 'logout-btn';
      btn.textContent = 'Sair';
      btn.onclick = function () {
        fetch('https://api.danilosn.work/logout', {
          method: 'POST',
          credentials: 'include'
        }).finally(function () {
          window.location.replace('/login.html');
        });
      };
      document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  }
})();
