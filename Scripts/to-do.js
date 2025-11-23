// const tarefa = document.querySelector("#tarefa");
// const btn = document.querySelector("#btn");
// const lista = document.querySelector("#lista");

// btn.addEventListener("click", function () {
//     if (tarefa.value === "") {
//         alert("bota algo");
//     } else {
//         lista.innerHTML += `
//             <li>
//                 <i class="fa-solid fa-genderless fa-sm check"></i>
//                 <span> ${tarefa.value}</span>
//                 <i class="fa-solid fa-ban fa-xs close"></i>
//             </li>
//         `;
//     }
//     tarefa.value = "";
// });

// lista.addEventListener("click", function (event) {
//     if (event.target.classList.contains("close")) {
//         const itemDaLista = event.target.parentElement;
//         itemDaLista.remove(); 
//     }
//     lista.addEventListener("click", function(e){
//         e.target.parentElement.querySelector(".check").style.color = "#349223";
//         e.target.parentElement.querySelector("span").style.textDecoration = "line-through";
//     })
// });



import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const dbCollection = collection(db, "tarefas");

// Elementos do DOM
const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");

// 1. ADICIONAR TAREFA
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

// 2. ATUALIZAR TELA (SNAPSHOT)
// Removemos o 'window.' e usamos direto 'onSnapshot' e 'dbCollection'
onSnapshot(dbCollection, (snapshot) => {
    lista.innerHTML = ""; 

    snapshot.forEach((item) => {
        const dados = item.data();
        const id = item.id;

        lista.innerHTML += `
            <li data-id="${id}">
                <i class="fa-solid fa-genderless fa-sm"></i>
                <span> ${dados.nome}</span>
                <i class="fa-solid fa-ban fa-xs close" style="cursor: pointer;"></i>
            </li>
        `;
    });
});

// 3. REMOVER TAREFA
lista.addEventListener("click", async function (event) {
    // Lógica de Deletar
    if (event.target.classList.contains("close")) {
        const itemLi = event.target.parentElement;
        const idParaRemover = itemLi.getAttribute("data-id");

        if (idParaRemover) {
            // Removemos o 'window.' aqui também
            // 'doc' precisa de 3 coisas: o banco (db), a coleção ("tarefas") e o ID
            await deleteDoc(doc(db, "tarefas", idParaRemover));
        }
    }

    // Lógica de Riscar (Visual apenas - não salva no banco neste código)
    if (event.target.tagName === "SPAN") {
        event.target.style.textDecoration =
            event.target.style.textDecoration === "line-through" ? "none" : "line-through";
    }
});