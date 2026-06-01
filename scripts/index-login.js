document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var msg = document.getElementById('login-message');
  msg.textContent = '';

  fetch('https://api.danilosn.work/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value
    })
  })
    .then(function (res) {
      if (res.ok) {
        window.location.replace('/index.html');
      } else {
        msg.textContent = 'Usuário ou senha inválidos.';
      }
    })
    .catch(function () {
      msg.textContent = 'Erro ao conectar. Tente novamente.';
    });
});
