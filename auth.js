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
        'position:fixed;bottom:14px;right:14px;top:auto;left:auto;' +
        'z-index:2147483647;' +
        'padding:7px 16px;' +
        'background:var(--card,#111827);' +
        'color:var(--text-muted,#9ca3af);' +
        'border:1px solid var(--border,#263244);' +
        'border-radius:var(--radius-sm,10px);' +
        'cursor:pointer;font-size:13px;line-height:1;font-family:inherit;' +
        'box-shadow:0 4px 14px rgba(0,0,0,0.45);opacity:0.9;' +
        'transition:color 0.15s,border-color 0.15s,background 0.15s,opacity 0.15s;' +
      '}' +
      '.logout-btn:hover{' +
        'opacity:1;' +
        'color:var(--text,#e5e7eb);' +
        'border-color:var(--danger,#dc2626);' +
        'background:rgba(220,38,38,0.16);' +
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
