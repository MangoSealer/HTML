const defaultCredentials = {
  // você nao deveria estar aqui
  username: "admin", 
  password: "Mangosealer@319169" 
};

function showSite() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("site-content").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("site-content").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("index-authenticated") === "true") {
    showSite();
    return;
  }

  showLogin();

  document.getElementById("login-form").addEventListener("submit", event => {
    event.preventDefault();

    const message = document.getElementById("login-message");
    message.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (username === defaultCredentials.username && password === defaultCredentials.password) {
      sessionStorage.setItem("index-authenticated", "true");
      showSite();
      return;
    }

    message.textContent = "Usuário ou senha inválidos.";
  });
});
