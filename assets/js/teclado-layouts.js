// teclado-layouts.js — os desenhos de teclado da /teclado/.
//
// Duas coisas separadas, de propósito:
//
//   - o FORMATO FÍSICO (ABNT2, ABNT, americano) e o TAMANHO (completo, TKL,
//     60%):
//     onde cada tecla fica e que tamanho tem. Cada tecla é identificada pelo
//     `event.code`, que é a POSIÇÃO física e não muda com o idioma — a tecla ao
//     lado do L é sempre "Semicolon", seja ela ; num teclado americano ou Ç num
//     ABNT2. É isso que deixa o teste valer pra qualquer layout;
//
//   - o IDIOMA DAS TECLAS: só o rótulo que aparece desenhado em cada posição.
//
// Medidas em "u", a unidade de tecla (1u = uma tecla de letra).

/* ---------------------------------------------------------------- formato */

// Uma linha do bloco principal: [code, largura] em sequência, da esquerda pra
// direita. As posições x saem da soma das larguras.
const PRINCIPAL = {
	ansi: [
		[["Backquote", 1], ...digitos(), ["Minus", 1], ["Equal", 1], ["Backspace", 2]],
		[["Tab", 1.5], ...letras("QWERTYUIOP"), ["BracketLeft", 1], ["BracketRight", 1], ["Backslash", 1.5]],
		[["CapsLock", 1.75], ...letras("ASDFGHJKL"), ["Semicolon", 1], ["Quote", 1], ["Enter", 2.25]],
		[["ShiftLeft", 2.25], ...letras("ZXCVBNM"), ["Comma", 1], ["Period", 1], ["Slash", 1], ["ShiftRight", 2.75]],
		rodape(),
	],
	// O ABNT antigo: Enter em "L" de duas linhas, e o Shift esquerdo encolhe
	// pra caber a tecla a mais (IntlBackslash, a do  |). É o mesmo desenho
	// físico do ISO europeu — só não entram aqui os idiomas de lá, por escolha.
	abnt: [
		[["Backquote", 1], ...digitos(), ["Minus", 1], ["Equal", 1], ["Backspace", 2]],
		[["Tab", 1.5], ...letras("QWERTYUIOP"), ["BracketLeft", 1], ["BracketRight", 1], ["Enter", 1.5, "enter-cima"]],
		[["CapsLock", 1.75], ...letras("ASDFGHJKL"), ["Semicolon", 1], ["Quote", 1], ["Backslash", 1], ["Enter", 1.25, "enter-baixo"]],
		[["ShiftLeft", 1.25], ["IntlBackslash", 1], ...letras("ZXCVBNM"), ["Comma", 1], ["Period", 1], ["Slash", 1], ["ShiftRight", 2.75]],
		rodape(),
	],
	// O ABNT2 é o ABNT com uma tecla a mais embaixo (IntlRo, a do / ?), que
	// rouba espaço do Shift direito.
	abnt2: [
		[["Backquote", 1], ...digitos(), ["Minus", 1], ["Equal", 1], ["Backspace", 2]],
		[["Tab", 1.5], ...letras("QWERTYUIOP"), ["BracketLeft", 1], ["BracketRight", 1], ["Enter", 1.5, "enter-cima"]],
		[["CapsLock", 1.75], ...letras("ASDFGHJKL"), ["Semicolon", 1], ["Quote", 1], ["Backslash", 1], ["Enter", 1.25, "enter-baixo"]],
		[["ShiftLeft", 1.25], ["IntlBackslash", 1], ...letras("ZXCVBNM"), ["Comma", 1], ["Period", 1], ["Slash", 1], ["IntlRo", 1], ["ShiftRight", 1.75]],
		rodape(),
	],
};

function digitos() {
	return [..."1234567890"].map((d) => [`Digit${d}`, 1]);
}

function letras(sequencia) {
	return [...sequencia].map((l) => [`Key${l}`, 1]);
}

function rodape() {
	return [
		["ControlLeft", 1.25],
		["MetaLeft", 1.25],
		["AltLeft", 1.25],
		["Space", 6.25],
		["AltRight", 1.25],
		["MetaRight", 1.25],
		["ContextMenu", 1.25],
		["ControlRight", 1.25],
	];
}

// A fileira das F, com os vãos entre os grupos de quatro.
const FILEIRA_F = [
	["Escape", 0],
	["F1", 2], ["F2", 3], ["F3", 4], ["F4", 5],
	["F5", 6.5], ["F6", 7.5], ["F7", 8.5], ["F8", 9.5],
	["F9", 11], ["F10", 12], ["F11", 13], ["F12", 14],
];

// [code, x, linha, largura, altura]. Linha 0 é a das F; 1 a 5 são as do
// bloco principal.
const NAVEGACAO = [
	["PrintScreen", 15.25, 0], ["ScrollLock", 16.25, 0], ["Pause", 17.25, 0],
	["Insert", 15.25, 1], ["Home", 16.25, 1], ["PageUp", 17.25, 1],
	["Delete", 15.25, 2], ["End", 16.25, 2], ["PageDown", 17.25, 2],
	["ArrowUp", 16.25, 4],
	["ArrowLeft", 15.25, 5], ["ArrowDown", 16.25, 5], ["ArrowRight", 17.25, 5],
];

function numerico(formato) {
	const base = [
		["NumLock", 18.5, 1], ["NumpadDivide", 19.5, 1], ["NumpadMultiply", 20.5, 1], ["NumpadSubtract", 21.5, 1],
		["Numpad7", 18.5, 2], ["Numpad8", 19.5, 2], ["Numpad9", 20.5, 2],
		["Numpad4", 18.5, 3], ["Numpad5", 19.5, 3], ["Numpad6", 20.5, 3],
		["Numpad1", 18.5, 4], ["Numpad2", 19.5, 4], ["Numpad3", 20.5, 4], ["NumpadEnter", 21.5, 4, 1, 2],
		["Numpad0", 18.5, 5, 2], ["NumpadDecimal", 20.5, 5],
	];
	// O numérico do ABNT2 divide o + em dois: + em cima e a tecla de ponto
	// (NumpadComma) embaixo.
	if (formato === "abnt2") return [...base, ["NumpadAdd", 21.5, 2], ["NumpadComma", 21.5, 3]];
	return [...base, ["NumpadAdd", 21.5, 2, 1, 2]];
}

// Vertical: a fileira das F fica meia tecla acima do bloco principal.
const Y_LINHA = [0, 1.5, 2.5, 3.5, 4.5, 5.5];

export const TAMANHOS = [
	{ id: "completo", nome: "completo (100%)" },
	{ id: "tkl", nome: "TKL (sem numérico)" },
	{ id: "60", nome: "60%" },
];

// Só os padrões que interessam aqui: os dois brasileiros e o americano.
export const FORMATOS = [
	{ id: "abnt2", nome: "ABNT2" },
	{ id: "abnt", nome: "ABNT (sem a tecla / ?)" },
	{ id: "ansi", nome: "americano (ANSI)" },
];

// Lista de teclas posicionadas: { code, x, y, w, h, extra }.
export function montarLayout(formato, tamanho) {
	const teclas = [];
	const temF = tamanho !== "60";
	const temNav = tamanho !== "60";
	const temNum = tamanho === "completo";
	const desloca = temF ? 0 : Y_LINHA[1];

	if (temF) for (const [code, x] of FILEIRA_F) teclas.push({ code, x, y: 0, w: 1, h: 1 });

	(PRINCIPAL[formato] || PRINCIPAL.ansi).forEach((linha, i) => {
		let x = 0;
		const y = Y_LINHA[i + 1] - desloca;
		for (const [code, w, extra] of linha) {
			// O Enter do ABNT vem em duas metades (o "L"). A de baixo cai 0,25u mais
			// pra dentro sozinha: na linha dela, o Backslash ocupa esse pedaço.
			teclas.push({ code, x, y, w, h: 1, extra });
			x += w;
		}
	});

	if (temNav) {
		for (const [code, x, linha, w = 1, h = 1] of NAVEGACAO) {
			teclas.push({ code, x, y: Y_LINHA[linha] - desloca, w, h });
		}
	}
	if (temNum) {
		for (const [code, x, linha, w = 1, h = 1] of numerico(formato)) {
			teclas.push({ code, x, y: Y_LINHA[linha] - desloca, w, h });
		}
	}

	const largura = Math.max(...teclas.map((t) => t.x + t.w));
	const altura = Math.max(...teclas.map((t) => t.y + t.h));
	return { teclas, largura, altura };
}

/* ----------------------------------------------------------------- rótulos */

// Rótulos que não mudam com o idioma.
const FIXOS = {
	Escape: "esc", Tab: "tab", CapsLock: "caps", Backspace: "⌫", Enter: "enter",
	ShiftLeft: "shift", ShiftRight: "shift", ControlLeft: "ctrl", ControlRight: "ctrl",
	MetaLeft: "win", MetaRight: "win", AltLeft: "alt", AltRight: "alt", ContextMenu: "menu",
	// Curtos o bastante pra caber numa tecla de 1u. "prt sc" e "scr lk" eram
	// siglas que ninguém lê de primeira e ainda saíam cortadas.
	Space: "", PrintScreen: "print", ScrollLock: "scroll", Pause: "pause",
	Insert: "ins", Home: "home", PageUp: "pg up", Delete: "del", End: "end", PageDown: "pg dn",
	ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
	NumLock: "num", NumpadDivide: "/", NumpadMultiply: "*", NumpadSubtract: "-", NumpadAdd: "+",
	NumpadEnter: "enter", NumpadDecimal: ".", NumpadComma: ".",
	...Object.fromEntries([..."0123456789"].map((d) => [`Numpad${d}`, d])),
	...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`])),
};

// O americano é a base; os outros só dizem o que muda.
const US = {
	Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\",
	Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", IntlBackslash: "\\", IntlRo: "/",
	...Object.fromEntries([..."1234567890"].map((d) => [`Digit${d}`, d])),
	...Object.fromEntries([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => [`Key${l}`, l])),
};

const DIFERENCAS = {
	us: {},
	abnt2: {
		Backquote: "'", BracketLeft: "´", BracketRight: "[", Backslash: "]", Semicolon: "Ç", Quote: "~",
		Slash: ";", IntlBackslash: "\\", IntlRo: "/", AltRight: "alt gr", NumpadDecimal: ",",
	},
};

export const IDIOMAS = [
	{ id: "auto", nome: "o do meu sistema" },
	{ id: "abnt2", nome: "português (ABNT / ABNT2)" },
	{ id: "us", nome: "inglês (americano)" },
];

// Rótulos de um idioma da lista. O "auto" é resolvido no teclado.js, com o que
// o navegador informar.
export function rotulosDe(idioma) {
	return { ...FIXOS, ...US, ...(DIFERENCAS[idioma] || {}) };
}

// Sem o idioma do sistema, o mais provável pra cada formato.
export const IDIOMA_DO_FORMATO = { abnt2: "abnt2", abnt: "abnt2", ansi: "us" };

export { FIXOS };
