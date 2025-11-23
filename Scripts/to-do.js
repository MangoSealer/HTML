import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SUAS CONFIGURAÇÕES ---
const firebaseConfig = {
    apiKey: "AIzaSyC2l6Rp1_L_udZyBuYWVuhhd9lSyRH-qPM",
    authDomain: "to-do-397d8.firebaseapp.com",
    projectId: "to-do-397d8",
    storageBucket: "to-do-397d8.firebasestorage.app",
    messagingSenderId: "791824707186",
    appId: "1:791824707186:web:9b2e663117be126b869ceb"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbCollection = collection(db, "tarefas"); // Sem ordenação, simples.

// Elementos do DOM
const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");

// --- NOVIDADE: EVENTO DE APERTAR ENTER ---
tarefa.addEventListener("keypress", function(event) {
    // Se a tecla pressionada for "Enter"
    if (event.key === "Enter") {
        event.preventDefault(); // Evita recarregar a página se estiver num form
        btn.click(); // O JS "clica" no botão por você
    }
});

// 1. ADICIONAR TAREFA (O botão continua funcionando igual)
btn.addEventListener("click", async function (event) {
    event.preventDefault();
    if (tarefa.value !== "") {
        try {
            await addDoc(dbCollection, { nome: tarefa.value });
            tarefa.value = "";
        } catch (error) {
            console.error("Erro ao adicionar: ", error);
        }
    } else {
        alert("Escreva algo!");
    }
});

// 2. ATUALIZAR TELA
onSnapshot(dbCollection, (snapshot) => {
    lista.innerHTML = ""; 

    snapshot.forEach((item) => {
        const dados = item.data();
        const id = item.id;

        lista.innerHTML += `
            <li data-id="${id}">
                <i class="fa-solid fa-genderless fa-sm butao"></i>
                <span> ${dados.nome}</span>
                <i class="fa-solid fa-ban fa-xs close butao" style="cursor: pointer;"></i>
            </li>
        `;
    });
});

// 3. REMOVER E RISCAR
lista.addEventListener("click", async function (event) {
    // CORREÇÃO AQUI: Use 'closest' em vez de 'classList.contains'
    // Isso pega o botão mesmo se você clicar no ícone dentro dele
    const botaoClicado = event.target.closest(".butao");

    if (botaoClicado) {
        // Atenção: Agora pegamos o pai do BOTÃO encontrado
        const itemLi = botaoClicado.parentElement; 
        const idParaRemover = itemLi.getAttribute("data-id");

        if (idParaRemover) {
            await deleteDoc(doc(db, "tarefas", idParaRemover));
        }
    }

    // Parte do SPAN continua igual (ou pode usar closest também se tiver negrito dentro do span)
    if (event.target.tagName === "SPAN") {
        event.target.style.textDecoration =
            event.target.style.textDecoration === "line-through" ? "none" : "line-through";
    }
});