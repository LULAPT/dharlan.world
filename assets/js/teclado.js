// teclado.js — o testador de teclado da /teclado/, no espírito do kbt: o
// teclado desenhado na tela acende a tecla enquanto ela está apertada e marca
// as que já foram testadas.
//
// O que um navegador NÃO consegue ver, e por isso não acende nunca:
//   - Fn: ela nem chega ao sistema, é resolvida dentro do próprio teclado;
//   - atalhos que o sistema toma antes (Ctrl+Alt+Del, Alt+F4, Win+L, Ctrl+W);
//   - no Windows, o Print Screen só avisa quando é SOLTO — por isso ele é
//     marcado no keyup também.

import { montarLayout, rotulosDe, FORMATOS, TAMANHOS, IDIOMAS, IDIOMA_DO_FORMATO } from "./teclado-layouts.js";
import { tocarTecla, tipoDaTecla } from "./teclas-som.js";
import { montarAjustes, ligarGaveta, iconeAjustes } from "./teclas-config.js";

const CHAVE = "teclado-config";
const PADRAO = { formato: "abnt2", tamanho: "completo", idioma: "auto" };

const $ = (id) => document.getElementById(id);
const palco = $("tec-teclado");
const info = {
	key: $("tec-key"),
	code: $("tec-code"),
	keyCode: $("tec-keycode"),
	local: $("tec-local"),
	seguradas: $("tec-seguradas"),
	maximo: $("tec-maximo"),
	testadas: $("tec-testadas"),
	barra: $("tec-barra"),
	fora: $("tec-fora"),
};

let config = lerConfig();
let som = { som: "nenhum", volume: 0 };
let elementos = new Map(); // code -> [elementos] (o Enter ISO tem dois)
let testadas = new Set();
let seguradas = new Set();
let maximo = 0;
let fora = new Set();
let mapaDoSistema = null;

function lerConfig() {
	let salva = {};
	try {
		salva = JSON.parse(localStorage.getItem(CHAVE) || "{}");
	} catch {}
	const c = { ...PADRAO, ...salva };
	// Config de uma visita antiga pode apontar pra um formato ou idioma que
	// saiu da lista ("iso", "azerty"...). Volta pro padrão em vez de deixar o
	// seletor em branco e o desenho sem rótulo.
	if (!FORMATOS.some((f) => f.id === c.formato)) c.formato = PADRAO.formato;
	if (!TAMANHOS.some((f) => f.id === c.tamanho)) c.tamanho = PADRAO.tamanho;
	if (!IDIOMAS.some((f) => f.id === c.idioma)) c.idioma = PADRAO.idioma;
	return c;
}

function gravarConfig() {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(config));
	} catch {}
}

/* ------------------------------------------------------------- rótulos */

// O idioma de verdade do teclado da pessoa. Só o Chrome e o Edge informam, e
// só em página segura (https ou localhost). Firefox e Safari não — aí vale o
// mais provável pro formato escolhido.
async function lerMapaDoSistema() {
	try {
		if (!navigator.keyboard?.getLayoutMap) return null;
		return await navigator.keyboard.getLayoutMap();
	} catch {
		return null;
	}
}

function rotulos() {
	if (config.idioma !== "auto") return rotulosDe(config.idioma);
	const base = rotulosDe(IDIOMA_DO_FORMATO[config.formato] || "us");
	if (!mapaDoSistema) return base;
	const doSistema = {};
	for (const [code, caractere] of mapaDoSistema) {
		// Só o que é caractere de verdade: as teclas de função continuam com os
		// rótulos fixos ("shift", "tab"...).
		if (caractere && caractere.trim()) doSistema[code] = caractere.length === 1 ? caractere.toUpperCase() : caractere;
	}
	return { ...base, ...doSistema };
}

/* ------------------------------------------------------------ desenho */

function desenhar() {
	const { teclas, largura, altura } = montarLayout(config.formato, config.tamanho);
	const nomes = rotulos();
	palco.textContent = "";
	elementos = new Map();
	palco.style.setProperty("--largura", largura);
	palco.style.setProperty("--altura", altura);

	for (const t of teclas) {
		const el = document.createElement("div");
		el.className = `tec-tecla${t.extra ? ` ${t.extra}` : ""}`;
		el.dataset.code = t.code;
		el.style.setProperty("--x", t.x);
		el.style.setProperty("--y", t.y);
		el.style.setProperty("--w", t.w);
		el.style.setProperty("--h", t.h);
		// A metade de baixo do Enter ISO não repete o rótulo.
		if (t.extra !== "enter-baixo") {
			const rotulo = document.createElement("span");
			rotulo.className = "tec-rotulo";
			rotulo.textContent = nomes[t.code] ?? t.code;
			el.append(rotulo);
		}
		if (testadas.has(t.code)) el.classList.add("testada");
		if (seguradas.has(t.code)) el.classList.add("pressionada");
		palco.append(el);
		if (!elementos.has(t.code)) elementos.set(t.code, []);
		elementos.get(t.code).push(el);
	}

	escalar();
	atualizarContagem();
}

// A unidade de tecla sai da largura disponível, pra o teclado inteiro caber
// na tela sem rolagem lateral, do 60% ao completo.
function escalar() {
	const largura = Number(palco.style.getPropertyValue("--largura")) || 22.5;
	// clientWidth inclui o padding da moldura. Sem descontar, o teclado era
	// calculado com uns 28px a mais do que cabe e transbordava pela direita,
	// saindo do centro.
	const moldura = palco.parentElement;
	const estilo = getComputedStyle(moldura);
	const disponivel =
		moldura.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
	const u = Math.max(18, Math.min(60, disponivel / largura));
	palco.style.setProperty("--u", `${u}px`);
	encaixarRotulos();
}

// A fonte da tecla é proporcional ao --u, mas rótulo comprido ("print",
// "scroll", "enter" no numérico) não cabe numa tecla de 1u nesse tamanho e
// saía cortado. Aqui cada rótulo que estoura diminui até caber — vale pra
// qualquer tamanho de tela, sem uma regra de CSS por tecla.
const FONTE_MINIMA = 7;

function encaixarRotulos() {
	const primeira = palco.querySelector(".tec-tecla");
	if (!primeira) return;
	const estilo = getComputedStyle(primeira);
	const folga = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight) + 2;
	for (const rotulo of palco.querySelectorAll(".tec-rotulo")) {
		rotulo.style.fontSize = "";
		const livre = rotulo.parentElement.clientWidth - folga;
		let tamanho = parseFloat(getComputedStyle(rotulo).fontSize);
		while (rotulo.offsetWidth > livre && tamanho - 0.5 >= FONTE_MINIMA) {
			tamanho -= 0.5;
			rotulo.style.fontSize = `${tamanho}px`;
		}
	}
}

new ResizeObserver(escalar).observe(palco.parentElement);

/* ---------------------------------------------------------- contagem */

function atualizarContagem() {
	const total = elementos.size;
	const feitas = [...testadas].filter((c) => elementos.has(c)).length;
	info.testadas.textContent = `${feitas} de ${total}`;
	info.barra.style.setProperty("--feito", total ? feitas / total : 0);
	info.seguradas.textContent = seguradas.size ? [...seguradas].join("  ") : "—";
	info.maximo.textContent = String(maximo);
	info.fora.textContent = fora.size ? [...fora].join("  ") : "—";
}

const LOCAIS = ["padrão", "esquerda", "direita", "numérico"];

function mostrarEvento(e) {
	info.key.textContent = e.key === " " ? "(espaço)" : e.key;
	info.code.textContent = e.code || "(sem code)";
	// keyCode é obsoleto, mas ainda é o que muito jogo e programa velho lê — e
	// é útil pra comparar quando um teclado manda algo estranho.
	info.keyCode.textContent = String(e.keyCode);
	info.local.textContent = LOCAIS[e.location] ?? String(e.location);
}

function marcar(code) {
	testadas.add(code);
	const els = elementos.get(code);
	if (els) for (const el of els) el.classList.add("testada");
	else if (code) fora.add(code);
}

/* ------------------------------------------------------------ eventos */

// Quando o foco está num dos seletores ou nos ajustes, a tecla é deles.
// O Esc com a gaveta aberta também não é testado: ele é de fechar a gaveta. O
// ouvinte da gaveta fica no document, e este roda antes, no window — sem esta
// checagem, o Esc entraria como tecla testada antes de a gaveta fechar.
function ehDeCampo(e) {
	if (e.key === "Escape" && gaveta?.aberta) return true;
	return Boolean(e.target.closest?.("select, input, textarea, button, a, #teclas-ajustes"));
}

window.addEventListener(
	"keydown",
	(e) => {
		if (ehDeCampo(e)) return;
		// Segura o que o navegador faria com a tecla (F5 recarregar, espaço
		// rolar, Alt abrir menu, / abrir a busca do Firefox...). Os atalhos do
		// sistema passam por cima disso de qualquer jeito.
		e.preventDefault();
		mostrarEvento(e);
		if (e.repeat) return;

		seguradas.add(e.code);
		maximo = Math.max(maximo, seguradas.size);
		marcar(e.code);
		for (const el of elementos.get(e.code) || []) el.classList.add("pressionada");
		atualizarContagem();
		tocarTecla(som.som, som.volume, tipoDaTecla(e.code), "desce");
	},
	true
);

window.addEventListener(
	"keyup",
	(e) => {
		if (ehDeCampo(e)) return;
		e.preventDefault();
		seguradas.delete(e.code);
		for (const el of elementos.get(e.code) || []) el.classList.remove("pressionada");
		// O Print Screen do Windows só aparece aqui, na hora de soltar.
		if (!testadas.has(e.code)) {
			mostrarEvento(e);
			marcar(e.code);
		}
		atualizarContagem();
		tocarTecla(som.som, som.volume, tipoDaTecla(e.code), "sobe");
	},
	true
);

// Trocar de janela com tecla segurada (Alt+Tab, o próprio Win): o keyup
// acontece fora da página e nunca chega. Sem isto a tecla ficaria acesa pra
// sempre e o "seguradas agora" mentiria.
window.addEventListener("blur", () => {
	seguradas.clear();
	for (const el of palco.querySelectorAll(".pressionada")) el.classList.remove("pressionada");
	atualizarContagem();
});

$("tec-zerar").addEventListener("click", () => {
	testadas = new Set();
	seguradas = new Set();
	fora = new Set();
	maximo = 0;
	for (const el of palco.querySelectorAll(".testada, .pressionada")) el.classList.remove("testada", "pressionada");
	atualizarContagem();
	// Com o foco no botão, as teclas seguintes seriam dele, não do teste.
	document.activeElement?.blur();
});

/* ------------------------------------------------------------ seletores */

function montarSeletor(id, lista, chave) {
	const select = $(id);
	for (const { id: valor, nome } of lista) {
		select.append(Object.assign(document.createElement("option"), { value: valor, textContent: nome }));
	}
	select.value = config[chave];
	select.addEventListener("change", () => {
		config[chave] = select.value;
		gravarConfig();
		desenhar();
		// Devolve o foco pra página: com ele no <select>, as próximas teclas
		// mudariam a opção em vez de serem testadas.
		select.blur();
	});
}

montarSeletor("tec-formato", FORMATOS, "formato");
montarSeletor("tec-tamanho", TAMANHOS, "tamanho");
montarSeletor("tec-idioma", IDIOMAS, "idioma");

/* --------------------------------------------------------------- início */

// O controle da gaveta de ajustes. Nasce quando o montarAjustes termina.
let gaveta = null;
const botaoAjustes = $("tec-botao-ajustes");
botaoAjustes.append(iconeAjustes());
botaoAjustes.addEventListener("click", () => gaveta?.alternar());

montarAjustes($("teclas-ajustes"), (c) => {
	som = c;
}).then(() => {
	// Ao fechar, o foco sai dos controles: com ele num <select>, as próximas
	// teclas mudariam a opção em vez de serem testadas.
	gaveta = ligarGaveta($("teclas-ajustes"), {
		aoFechar: () => document.activeElement?.blur(),
	});
});
// Mesma coisa nos ajustes: escolheu o som ou o fundo, o foco volta pra página
// e o teclado volta a ser testado.
$("teclas-ajustes").addEventListener("change", (e) => e.target.blur?.());

// O encaixe dos rótulos mede texto: feito antes de a ANK carregar, ele mede a
// fonte de reserva, que tem outra largura. Refaz quando as fontes chegarem.
document.fonts?.ready.then(encaixarRotulos);

lerMapaDoSistema().then((mapa) => {
	mapaDoSistema = mapa;
	desenhar();
});
desenhar();
