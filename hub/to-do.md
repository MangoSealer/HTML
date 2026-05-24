# Como Criar um Novo Checklist

Para adicionar um novo checklist ao projeto, siga os passos abaixo:

## 1. Estrutura de Pastas
Crie uma nova subpasta em `hub/` com o nome da lista em minúsculas (ex: `hub/novalista/`).

## 2. Arquivos Necessários na Subpasta

### `to-do.css`
Crie este arquivo para definir a identidade visual. Evite cores muito brilhantes:
```css
@import "../../style/to-do-geral.css";

header {
    background-color: #suaCorAqui; /* Escolha uma cor agradável (ex: #2d6a4f ou #e50914) */
}
```

### `to-do.js`
Configure a conexão ao Firebase. **O nome da coleção no Firestore deve ser idêntico ao nome da lista**:
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2l6Rp1_L_udZyBuYWVuhhd9lSyRH-qPM",
    authDomain: "to-do-397d8.firebaseapp.com",
    projectId: "to-do-397d8",
    storageBucket: "to-do-397d8.firebasestorage.app",
    messagingSenderId: "791824707186",
    appId: "1:791824707186:web:9b2e663117be126b869ceb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbCollection = collection(db, "novalista"); // Nome idêntico ao da lista

const q = query(dbCollection, orderBy("criadoEm"));
const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");

tarefa.addEventListener("keypress", (event) => {
    if (event.key === "Enter") { event.preventDefault(); btn.click(); }
});

btn.addEventListener("click", async (event) => {
    event.preventDefault();
    if (tarefa.value !== "") {
        const valor = tarefa.value;
        tarefa.value = "";
        try {
            await addDoc(dbCollection, { nome: valor, criadoEm: Date.now() });
        } catch (error) {
            console.error("Erro ao adicionar: ", error);
        }
    } else {
        alert("Escreva algo!");
    }
});

onSnapshot(q, (snapshot) => {
    lista.innerHTML = "";
    snapshot.forEach((item) => {
        const dados = item.data();
        const id = item.id;
        lista.innerHTML += `
            <li class="item my-form" data-id="${id}">
                <i class="fa-solid fa-genderless fa-sm "></i>
                <span> ${dados.nome}</span>
                <i class="fa-solid fa-ban fa-xs close" style="cursor: pointer;"></i>
            </li>
        `;
    });
});

lista.addEventListener("click", async (event) => {
    const botaoClicado = event.target.closest(".close");
    if (botaoClicado) {
        const itemLi = botaoClicado.parentElement;
        const idParaRemover = itemLi.getAttribute("data-id");
        if (idParaRemover) {
            await deleteDoc(doc(db, "novalista", idParaRemover));
        }
    }
});
```

### `index.html`
Crie o arquivo HTML integrando os estilos, os scripts e o botão para o interruptor de luz inteligente do quarto:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Nome da Lista</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="icon" href="../../assets/seasky.ico">
    <link rel="stylesheet" href="../../style/fonte_bonitinha.css">
    <link rel="stylesheet" href="../../style/interruptor.css">
    <link rel="stylesheet" href="./to-do.css">
    <script src="https://code.jquery.com/jquery-3.6.4.js"></script>
    <script src="https://kit.fontawesome.com/a4aed1fa5c.js" crossorigin="anonymous"></script>
    <script src="../../scripts/modoescuro.js"></script>
    <script type="module" src="./to-do.js"></script>
</head>
<header>
    <ul class="testa">
        <li class="cabecalho"><a href="../../index.html">Home</a></li>
        <li class="dropdown cabecalho">
            <a href="javascript:void(0)" class="dropbtn">Outras Listas</a>
            <div class="dropdown-content">
                <!-- Dropdown completo e ordenado atualizado -->
            </div>
        </li>
    </ul>
    <span class="interruptor"><i class="fa-solid fa-circle-half-stroke fa-flip"></i></span>
    <span class="interruptor-luz"><i class="fa-solid fa-lightbulb"></i></span>
    <h1>Nome da Lista</h1>
    <input type="text" id="tarefa" placeholder="digite sua tarefa">
    <span id="btn"><i class="fas fa-plus-circle"></i></span>
</header>
<body class="modo-escuro">
    <ul id="lista"></ul>
    <script src="../../scripts/luz.js"></script>
</body>
</html>
```

## 3. Integração ao Projeto

### Atualizar os Menus Dropdown
Adicione o link do novo checklist no bloco `<div class="dropdown-content">` de **todos** os `index.html` (existentes e o novo):
```html
<a href="../../hub/novalista/index.html">Nome da Lista</a>
```
* **IMPORTANTE**: Mantenha o link da página `Testes` sempre como o **último** item da lista de dropdown.

### Adicionar Card no Hub
Adicione o cartão de acesso em `hub/index.html`:
```html
<a class="cartao" href="../hub/novalista/index.html">
    <div class="conteiner">
        <img src="../assets/checklist_img.png" alt="checklist_img">
        <div class="detalhes">
            <h3>Nome da Lista</h3>
        </div>
    </div>
</a>
```
