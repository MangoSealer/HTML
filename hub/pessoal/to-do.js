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


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbCollection = collection(db, "pessoal");


const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");


tarefa.addEventListener("keypress", function (event) {

    if (event.key === "Enter") {
        event.preventDefault();
        btn.click();
    }
});


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


onSnapshot(dbCollection, (snapshot) => {
    lista.innerHTML = "";

    snapshot.forEach((item) => {
        const dados = item.data();
        const id = item.id;

        lista.innerHTML += `
            <li data-id="${id}">
                <i class="fa-solid fa-genderless fa-sm "></i>
                <span> ${dados.nome}</span>
                <i class="fa-solid fa-ban fa-xs close" style="cursor: pointer;"></i>
            </li>
        `;
    });
});

// remover
lista.addEventListener("click", async function (event) {
    const botaoClicado = event.target.closest(".close");
    if (botaoClicado) {
        const itemLi = botaoClicado.parentElement;
        const idParaRemover = itemLi.getAttribute("data-id");
        if (idParaRemover) {
            await deleteDoc(doc(db, "pessoal", idParaRemover));
        }
    }


});