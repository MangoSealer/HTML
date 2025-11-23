// const tarefa = document.querySelector("#tarefa");
// const btn = document.querySelector("#btn");
// const lista = document.querySelector("#lista");



// btn.addEventListener("click", function () {
//     if (tarefa.value == "") {
//         alert("bota algo")
//     } else {
//         lista.innerHTML += `
//                         <li>
//                             <i class="fa-solid fa-genderless fa-sm"></i>
//                             <span> ${tarefa.value}</span>
//                             <i class="fa-solid fa-ban fa-xs close"></i>
//                         </li> `
//     }
//     tarefa.value = "";
//     const close = document.querySelectorAll(".close")
//     for (let i = 0; i < close.length; i++) {
//         close[i].addEventListener("click", function () {
//             close[i].parentElement.remove()
//         })
//     }
// })

const tarefa = document.querySelector("#tarefa");
const btn = document.querySelector("#btn");
const lista = document.querySelector("#lista");

btn.addEventListener("click", function () {
    if (tarefa.value === "") {
        alert("bota algo");
    } else {
        lista.innerHTML += `
            <li>
                <i class="fa-solid fa-genderless fa-sm check"></i>
                <span> ${tarefa.value}</span>
                <i class="fa-solid fa-ban fa-xs close"></i>
            </li>
        `;
    }
    tarefa.value = "";
});

lista.addEventListener("click", function (event) {
    if (event.target.classList.contains("close")) {
        const itemDaLista = event.target.parentElement;
        itemDaLista.remove(); 
    }
    lista.addEventListener("click", function(e){
        e.target.parentElement.querySelector(".check").style.color = "#349223";
        e.target.parentElement.querySelector("span").style.textDecoration = "line-through";
    })
});


