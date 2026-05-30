(function () {
  document.documentElement.style.visibility = 'hidden';

  fetch('https://api.danilosn.work/site/me', { credentials: 'include' })
    .then(function (res) {
      if (res.status === 401) {
        window.location.replace('/login.html');
        return;
      }
      document.documentElement.style.visibility = '';
      addLogoutButton();
    })
    .catch(function () {
      window.location.replace('/login.html');
    });

  function addLogoutButton() {
    function inject() {
      if (!document.body) return;
      var btn = document.createElement('button');
      btn.textContent = '✕';
      btn.setAttribute(
        'style',
        'position:fixed;top:12px;right:12px;z-index:9999;' +
        'width:32px;height:32px;' +
        'background:#c53030;color:#fff;border:none;border-radius:50%;' +
        'cursor:pointer;font-size:15px;line-height:1;' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0.35;transition:opacity 0.15s;'
      );
      btn.onmouseenter = function () { btn.style.opacity = '1'; };
      btn.onmouseleave = function () { btn.style.opacity = '0.35'; };
      btn.onclick = function () {
        fetch('https://api.danilosn.work/site/logout', {
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
