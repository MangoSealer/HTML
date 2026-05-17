const interruptorLuz = document.querySelector(".interruptor-luz");

async function alternarLuz() {
    try {
        const response = await fetch("https://api.danilosn.work/api/smart/quarto/toggle", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Erro ao alternar luz");
        }

        const data = await response.json();

        const icone = interruptorLuz.querySelector("i");

        if (data.on) {
            icone.classList.remove("apagada");
        } else {
            icone.classList.add("apagada");
        }

    } catch (erro) {
        console.error(erro);
    }
}

interruptorLuz.addEventListener("click", alternarLuz);


async function atualizarEstadoInicial() {
    try {
        const response = await fetch("https://api.danilosn.work/api/smart/quarto/status");''

        if (!response.ok) return;

        const data = await response.json();

        const icone = interruptorLuz.querySelector("i");

        if (data.on) {
            icone.classList.remove("apagada");
        } else {
            icone.classList.add("apagada");
        }

    } catch (erro) {
        console.error(erro);
    }
}

atualizarEstadoInicial();