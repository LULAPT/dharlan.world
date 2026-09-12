// radio-mini.js — o rádio "flutuando" no canto inferior direito.
//
// Chamado pelo main.js em toda página. Usa a MESMA marcação do deck da /radio/
// (ver radio-ui.js), então herda o tema escolhido sem nenhuma cópia de estilo —
// o que muda é só o bloco .radio-mini do radio.css, que encolhe e reposiciona.

import { carregarEstacoes, estaDestacado, setDestacado } from "/assets/js/radio.js";
import { montarPlayer } from "/assets/js/radio-ui.js";

const CAMINHO_CSS = "/assets/css/radio.css";

function garantirCss() {
	if (document.querySelector(`link[href="${CAMINHO_CSS}"]`)) return;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = CAMINHO_CSS;
	document.head.appendChild(link);
}

function estaNaPaginaDoRadio() {
	return /^\/radio\/?$/.test(location.pathname);
}

export async function iniciarRadioMini() {
	// Na própria /radio/ quem manda é o deck grande.
	if (!estaDestacado() || estaNaPaginaDoRadio()) return;
	if (document.getElementById("web-deck-player")) return;

	let estacoes;
	try {
		estacoes = await carregarEstacoes();
	} catch (erro) {
		// Rádio é enfeite: se as estações não vierem, a página segue normal.
		console.error("Rádio mini:", erro.message);
		return;
	}

	garantirCss();

	const caixa = document.createElement("div");
	document.body.appendChild(caixa);

	const { radio } = montarPlayer(caixa, estacoes, {
		titulo: "RADIO",
		mini: true,
	});

	// Botões que só fazem sentido no modo flutuante, em dois grupos: o "^" numa
	// ponta, recolher/fechar na outra. O título fica centrado entre eles — quem
	// ancora os grupos nas pontas é o radio.css, com position: absolute, pra não
	// mexer no nó de texto do título.
	//
	// Glifos ASCII de propósito: a fonte Silkscreen dos temas não tem seta nem ×.
	const barra = caixa.querySelector("#player-title-bar");

	const esquerda = document.createElement("span");
	esquerda.id = "radio-mini-acoes-esq";
	esquerda.innerHTML = `
		<a href="/radio/" title="Abrir a página do rádio">^</a>
	`;
	barra.prepend(esquerda);

	const direita = document.createElement("span");
	direita.id = "radio-mini-acoes";
	direita.innerHTML = `
		<button type="button" id="radio-mini-recolher" title="Recolher">_</button>
		<button type="button" id="radio-mini-fechar" title="Fechar o rádio">X</button>
	`;
	barra.appendChild(direita);

	const abrir = caixa.querySelector("#radio-mini-acoes-esq a");
	const recolher = caixa.querySelector("#radio-mini-recolher");

	// O "^" muda de função conforme o estado. Recolhido, a barra de título é a
	// única coisa na tela, e ali "^" só pode querer dizer "abre de volta" — ir
	// pra outra página seria surpresa. Aberto, ele volta a ser o link pra
	// /radio/. Continua sendo um <a> de verdade: assim o clique do meio e o
	// "abrir em nova aba" seguem funcionando quando ele é link.
	function ajustarAbrir() {
		const recolhido = caixa.classList.contains("recolhido");
		abrir.title = recolhido ? "Abrir o player" : "Abrir a página do rádio";
	}

	abrir.addEventListener("click", (e) => {
		if (!caixa.classList.contains("recolhido")) return;
		e.preventDefault();
		// stopPropagation além do preventDefault por causa do fade-in.js: ele
		// escuta clique no document, pega qualquer <a href> e navega sozinho com
		// window.location. Cancelar o padrão do navegador não segura ele — o que
		// segura é o evento não chegar lá.
		e.stopPropagation();
		caixa.classList.remove("recolhido");
		ajustarAbrir();
	});

	recolher.addEventListener("click", () => {
		caixa.classList.toggle("recolhido");
		ajustarAbrir();
	});

	ajustarAbrir();

	caixa.querySelector("#radio-mini-fechar").addEventListener("click", () => {
		setDestacado(false);
		radio.destruir();
		caixa.remove();
	});
}
