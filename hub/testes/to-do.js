import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const dbCollection = collection(db, "testes");

const q = query(dbCollection, orderBy("criadoEm"));

const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");


tarefa.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        btn.click();
    }
});


btn.addEventListener("click", async function (event) {
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
            <div class="item my-form" id="checklist" data-id="${id}">
                <input type="checkbox" class="check">
                <label>${dados.nome}</label>
                <i class="fa-solid fa-ban fa-xs close" style="cursor:pointer;"></i>
            </div>
        `;
    });
});


lista.addEventListener("click", async (event) => {
    const botaoClicado = event.target.closest(".close");

    if (botaoClicado) {
        const item = botaoClicado.closest(".item");
        const idParaRemover = item.getAttribute("data-id");

        if (idParaRemover) {
            await deleteDoc(doc(db, "testes", idParaRemover));
        }
    }
});