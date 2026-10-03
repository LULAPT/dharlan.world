// teclas-config.js — os ajustes que a /digitacao/ e a /teclado/ dividem: som
// do switch, volume, tema e papel de parede.
//
// Tudo numa chave só do localStorage (`teclas-config`), menos a imagem que a
// pessoa sobe do próprio PC, que mora separada (`teclas-papel`) por ser grande
// — se ela estourar a cota, só ela se perde, não os outros ajustes.

import { PERFIS } from "./teclas-som.js";

const CHAVE = "teclas-config";
const CHAVE_PAPEL = "teclas-papel";

// O que quem chega pela primeira vez recebe — escolhido pelo dono. Quem já
// mexeu fica com o que escolheu (salvo em teclas-config).
const PADRAO = {
	som: "red",
	volume: 0.2,
	somErro: true,
	papel: "mulholland-cinza",
	escurecer: 0.6,
};

// As imagens de fundo que o site já tem (as mesmas da /inventario/), em três
// tons cada. O tom "branco" casa com o tema claro.
const FILMES = [
	["alien", "Alien"],
	["mulholland", "Mulholland Dr."],
	["paris-texas", "Paris, Texas"],
	["werewolf", "Lobisomem"],
];
const TONS = [
	["rosa", "rosa"],
	["cinza", "cinza"],
	["branco", "branco"],
];

export const PAPEIS = [
	{ id: "nenhum", nome: "nenhum" },
	...FILMES.flatMap(([arquivo, nome]) =>
		TONS.map(([tom, nomeTom]) => ({
			id: `${arquivo}-${tom}`,
			nome: `${nome} (${nomeTom})`,
			url: `/assets/img/bg/${arquivo}-1080px-${tom}.jpg`,
		}))
	),
	{ id: "proprio", nome: "imagem do seu PC…" },
];

export function lerConfig() {
	try {
		return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") };
	} catch {
		return { ...PADRAO };
	}
}

function gravarConfig(config) {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(config));
	} catch {
		// Sem armazenamento (aba anônima, bloqueado): vale só nesta visita.
	}
}

/* -------------------------------------------------------------- fundo */

// A imagem do PC também fica em memória: se não couber no localStorage, ela
// ainda vale até a página fechar, em vez de sumir no instante seguinte.
let papelDaSessao = null;

function urlDoPapel(config) {
	if (config.papel === "proprio") {
		if (papelDaSessao) return papelDaSessao;
		try {
			return localStorage.getItem(CHAVE_PAPEL);
		} catch {
			return null;
		}
	}
	return PAPEIS.find((p) => p.id === config.papel)?.url || null;
}

// O papel vai no próprio <body>, por cima de uma camada da cor de fundo do
// tema — é o `escurecer`. Sem ela o texto do teste se perderia em cima de uma
// foto clara.
export function aplicarPapel(config) {
	const url = urlDoPapel(config);
	document.body.classList.toggle("com-papel", Boolean(url));
	if (url) {
		document.body.style.setProperty("--teclas-papel", `url("${url}")`);
		document.body.style.setProperty("--teclas-escurecer", String(config.escurecer));
	} else {
		document.body.style.removeProperty("--teclas-papel");
	}
}

// A imagem do PC é reduzida antes de guardar: uma foto de celular tem vários
// MB e não cabe no localStorage. 1600px de largura em JPEG dá umas centenas de
// KB e ainda cobre um monitor full HD.
function reduzirImagem(arquivo) {
	return new Promise((resolve, reject) => {
		const leitor = new FileReader();
		leitor.onerror = reject;
		leitor.onload = () => {
			const img = new Image();
			img.onerror = reject;
			img.onload = () => {
				const escala = Math.min(1, 1600 / img.width);
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * escala);
				canvas.height = Math.round(img.height * escala);
				canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", 0.82));
			};
			img.src = leitor.result;
		};
		leitor.readAsDataURL(arquivo);
	});
}

/* -------------------------------------------------------------- barra */

function criar(tag, atributos = {}, filhos = []) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(atributos)) {
		if (k === "texto") el.textContent = v;
		else if (k === "classe") el.className = v;
		else el.setAttribute(k, v);
	}
	el.append(...filhos);
	return el;
}

function opcoes(select, lista, valor) {
	for (const { id, nome } of lista) {
		const op = criar("option", { value: id, texto: nome });
		select.append(op);
	}
	select.value = valor;
}

// A barra de ajustes que aparece embaixo das duas páginas. `aoMudar` recebe a
// config nova sempre que algo muda — é como a página fica sabendo do som.
export async function montarAjustes(destino, aoMudar) {
	let config = lerConfig();
	// Ficou "imagem do PC" de uma visita em que ela não coube na cota: não há
	// imagem nenhuma pra mostrar, então volta pro nenhum em vez de um seletor
	// apontando pro vazio.
	if (config.papel === "proprio" && !urlDoPapel(config)) config.papel = "nenhum";

	const mudar = (parcial) => {
		config = { ...config, ...parcial };
		gravarConfig(config);
		aplicarPapel(config);
		escurecerCampo.hidden = config.papel === "nenhum";
		aoMudar?.(config);
	};

	// --- som ---
	const som = criar("select", { "aria-label": "som das teclas" });
	opcoes(som, PERFIS, config.som);
	som.addEventListener("change", () => mudar({ som: som.value }));

	const volume = criar("input", {
		type: "range",
		min: "0",
		max: "1",
		step: "0.05",
		"aria-label": "volume",
	});
	volume.value = String(config.volume);
	volume.addEventListener("input", () => mudar({ volume: Number(volume.value) }));

	// --- tema: os mesmos do seletor da engrenagem ---
	const tema = criar("select", { "aria-label": "tema" });
	let temas = [
		{ id: "dark", nome: "Escuro" },
		{ id: "light", nome: "Claro" },
		{ id: "steam-green", nome: "Steam Green" },
	];
	try {
		const r = await fetch("/assets/json/themes.json");
		if (r.ok) temas = (await r.json()).map((t) => ({ id: t.id, nome: t.label }));
	} catch {
		// Fica a lista de reserva acima.
	}
	let temaAtual = "dark";
	try {
		temaAtual = localStorage.getItem("current-theme") || "dark";
	} catch {}
	opcoes(tema, temas, temaAtual);
	tema.addEventListener("change", () => {
		try {
			localStorage.setItem("current-theme", tema.value);
		} catch {}
		// O mesmo caminho da engrenagem. Se o módulo dela ainda não tiver
		// carregado, o atributo resolve sozinho — é o que o theme-init.js faz.
		if (typeof window.setTheme === "function") window.setTheme(tema.value);
		else if (tema.value === "dark") document.documentElement.removeAttribute("data-theme");
		else document.documentElement.setAttribute("data-theme", tema.value);
	});

	// --- papel de parede ---
	const papel = criar("select", { "aria-label": "papel de parede" });
	opcoes(papel, PAPEIS, config.papel);
	const arquivo = criar("input", { type: "file", accept: "image/*", hidden: "" });
	let papelAnterior = config.papel;

	papel.addEventListener("change", () => {
		if (papel.value === "proprio") {
			arquivo.click();
			return;
		}
		papelAnterior = papel.value;
		mudar({ papel: papel.value });
	});

	arquivo.addEventListener("change", async () => {
		const escolhido = arquivo.files?.[0];
		arquivo.value = "";
		if (!escolhido) {
			papel.value = papelAnterior;
			return;
		}
		try {
			const dados = await reduzirImagem(escolhido);
			papelDaSessao = dados;
			try {
				localStorage.setItem(CHAVE_PAPEL, dados);
			} catch {
				// Não coube na cota: vale só nesta visita, pelo papelDaSessao.
			}
			papelAnterior = "proprio";
			mudar({ papel: "proprio" });
		} catch {
			papel.value = papelAnterior;
		}
	});

	const escurecer = criar("input", {
		type: "range",
		min: "0.3",
		max: "0.95",
		step: "0.05",
		"aria-label": "escurecer o fundo",
	});
	escurecer.value = String(config.escurecer);
	escurecer.addEventListener("input", () => mudar({ escurecer: Number(escurecer.value) }));

	// --- montagem ---
	const campo = (rotulo, ...filhos) =>
		criar("label", { classe: "teclas-ajuste" }, [criar("span", { texto: rotulo }), ...filhos]);

	const escurecerCampo = campo("escurecer", escurecer);
	escurecerCampo.hidden = config.papel === "nenhum";

	destino.append(
		campo("som", som),
		campo("volume", volume),
		campo("tema", tema),
		campo("fundo", papel, arquivo),
		escurecerCampo
	);

	aplicarPapel(config);
	aoMudar?.(config);
	return config;
}

/* -------------------------------------------------------------- gaveta */

// O ícone do botão que abre a gaveta: três controles deslizantes, em traço,
// herdando a cor do texto. Constante deste arquivo — entrar por innerHTML não
// abre porta nenhuma.
export function iconeAjustes() {
	const span = document.createElement("span");
	span.className = "teclas-ic";
	span.setAttribute("aria-hidden", "true");
	span.innerHTML =
		'<svg viewBox="0 0 16 16"><path d="M2 4h7M12.5 4H14M2 8h2M7 8h7M2 12h9M14 12h0"/><circle cx="10.5" cy="4" r="1.6"/><circle cx="5.5" cy="8" r="1.6"/><circle cx="12.5" cy="12" r="1.6"/></svg>';
	return span;
}

// A gaveta de ajustes como popup: abre e fecha pelo botão que tiver
// aria-controls apontando pra ela, e fecha também com Esc, com clique fora e
// com o botão "fechar" que é acrescentado no fim dela. `aoFechar` diz pra
// onde vai o foco — cada página sabe onde o teclado tem que voltar.
//
// Chamar depois do montarAjustes ter terminado: ele é assíncrono (lê a lista
// de temas), e o botão de fechar tem que entrar depois dos controles.
export function ligarGaveta(gaveta, { aoFechar } = {}) {
	let aberta = false;
	const botoes = () => document.querySelectorAll(`[aria-controls="${gaveta.id}"]`);

	function definir(estado) {
		aberta = estado;
		gaveta.classList.toggle("aberta", estado);
		for (const b of botoes()) {
			b.classList.toggle("ativo", estado);
			b.setAttribute("aria-expanded", String(estado));
		}
		if (estado) {
			// Foco no primeiro controle, na hora — a gaveta fica visível no mesmo
			// instante. Adiar pra um requestAnimationFrame abria uma corrida:
			// fechada antes do quadro seguinte, ela devolvia o foco a um controle
			// já escondido.
			gaveta.querySelector("select")?.focus({ preventScroll: true });
		} else {
			aoFechar?.();
		}
	}

	const fechar = document.createElement("button");
	fechar.type = "button";
	fechar.className = "teclas-fechar";
	fechar.textContent = "fechar (esc)";
	fechar.addEventListener("click", () => definir(false));
	gaveta.append(fechar);

	// Na fase de captura: com a gaveta aberta, o Esc só fecha ela — não chega
	// à página (na /digitacao/ ele soltaria o foco do texto; na /teclado/ ele
	// seria marcado como tecla testada).
	document.addEventListener(
		"keydown",
		(e) => {
			if (e.key !== "Escape" || !aberta) return;
			e.preventDefault();
			e.stopPropagation();
			definir(false);
		},
		true
	);

	document.addEventListener("click", (e) => {
		if (!aberta) return;
		if (gaveta.contains(e.target) || e.target.closest(`[aria-controls="${gaveta.id}"]`)) return;
		definir(false);
	});

	return {
		alternar: () => definir(!aberta),
		fechar: () => definir(false),
		get aberta() {
			return aberta;
		},
	};
}
