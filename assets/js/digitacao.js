// digitacao.js — o teste de digitação da /digitacao/, no espírito do
// monkeytype e do boomtypr: modos tempo, palavras, citação e zen, com desafios.
//
// O que se digita entra por um <input> escondido, não por `keydown` solto na
// página. É o que faz acento funcionar: no ABNT2 o "é" é uma tecla morta (´)
// seguida do "e", e só o evento `input` entrega o caractere já composto. Com
// keydown chegariam "Dead" e "e", e o teste daria erro em toda palavra
// acentuada do português.
//
// O input guarda só a palavra atual. Espaço fecha a palavra; backspace com o
// campo vazio volta pra anterior (se ela tiver erro, como no monkeytype).

import { PALAVRAS, CITACOES } from "./digitacao-palavras.js";
import { tocarTecla, tocarErro, tipoDaTecla } from "./teclas-som.js";
import { montarAjustes, ligarGaveta, iconeAjustes } from "./teclas-config.js";

const CHAVE_CONFIG = "digitacao-config";
const CHAVE_RECORDES = "digitacao-recordes";

const MODOS = {
	tempo: { rotulo: "tempo", opcoes: [15, 30, 60, 120], sufixo: "s" },
	palavras: { rotulo: "palavras", opcoes: [10, 25, 50, 100], sufixo: "" },
	citacao: { rotulo: "citação", opcoes: ["curta", "media", "longa"], nomes: { media: "média" } },
	zen: { rotulo: "zen", opcoes: [] },
};

const DESAFIOS = {
	nenhum: { nome: "nenhum", regra: "" },
	"sem-errar": { nome: "sem errar", regra: "o primeiro erro encerra o teste." },
	"sem-voltar": { nome: "sem voltar", regra: "o backspace não funciona — errou, ficou." },
	"as-cegas": { nome: "às cegas", regra: "os erros não aparecem enquanto você digita, só no resultado." },
	neblina: { nome: "neblina", regra: "só a palavra atual e a próxima ficam visíveis." },
	fantasma: { nome: "fantasma", regra: "um cursor fantasma corre na velocidade do seu recorde. vença ele." },
	maratona: { nome: "maratona", regra: "250 palavras, sem limite de tempo." },
};

// O que quem chega pela primeira vez vê: tempo de 15s, sem desafio, sem
// pontuação e sem números. Quem já mexeu nas opções fica com as suas — elas
// ficam salvas em digitacao-config.
const PADRAO = {
	modo: "tempo",
	tempo: 15,
	palavras: 25,
	citacao: "media",
	idioma: "pt",
	pontuacao: false,
	numeros: false,
	desafio: "nenhum",
};

const $ = (id) => document.getElementById(id);
const area = $("dig-area");
const entrada = $("dig-entrada");
const trilho = $("dig-trilho");
const janela = $("dig-palavras");
const cursor = $("dig-cursor");
const fantasma = $("dig-fantasma");
const contador = $("dig-contador");
const resultado = $("dig-resultado");
const fonte = $("dig-fonte");
const regra = $("dig-regra");

/* -------------------------------------------------------------- estado */

let config = lerConfig();
let som = { som: "nenhum", volume: 0, somErro: false };

let palavras = [];
let digitadas = [];
let elsPalavras = [];
let atual = 0;
let iniciado = false;
let terminado = false;
let inicio = 0;
let teclas = { total: 0, erradas: 0 };
let espacosCertos = 0;
let amostras = [];
let errosNoSegundo = 0;
let valorContado = "";
let relogio = null;
let quadro = null;
let alturaLinha = 0;
let deslocamento = 0;
let citacaoAtual = null;

function lerConfig() {
	try {
		return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_CONFIG) || "{}") };
	} catch {
		return { ...PADRAO };
	}
}

function gravarConfig() {
	try {
		localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config));
	} catch {}
}

/* ------------------------------------------------------- gerar o texto */

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Pontuação no meio das palavras soltas, pra o teste parecer frase: maiúscula
// depois de ponto, vírgula de vez em quando, uma pergunta aqui e ali.
function pontuar(lista) {
	let maiuscula = true;
	return lista.map((p, i) => {
		let palavra = maiuscula ? p[0].toUpperCase() + p.slice(1) : p;
		maiuscula = false;
		const ultima = i === lista.length - 1;
		const sorte = Math.random();
		if (ultima || sorte < 0.08) {
			palavra += sortear([".", ".", ".", "?", "!"]);
			maiuscula = true;
		} else if (sorte < 0.18) {
			palavra += sortear([",", ",", ",", ";", ":"]);
		}
		return palavra;
	});
}

function numerar(lista) {
	return lista.map((p) =>
		Math.random() < 0.12 ? String(Math.floor(Math.random() * 10 ** (1 + Math.floor(Math.random() * 4)))) : p
	);
}

function gerarPalavras(qtd) {
	const banco = PALAVRAS[config.idioma] || PALAVRAS.pt;
	const lista = [];
	for (let i = 0; i < qtd; i++) {
		let p = sortear(banco);
		// Evita a mesma palavra duas vezes seguidas, que o sorteio puro faz
		// mais do que parece.
		while (lista.length && p === lista[lista.length - 1]) p = sortear(banco);
		lista.push(p);
	}
	let saida = config.numeros ? numerar(lista) : lista;
	if (config.pontuacao) saida = pontuar(saida);
	return saida;
}

// Modos sem fim (tempo, zen com alvo, fantasma) começam com um bloco e ganham
// mais palavras quando a pessoa chega perto do fim.
function modoEfetivo() {
	return config.desafio === "maratona" ? "palavras" : config.modo;
}

function quantidadeInicial() {
	if (config.desafio === "maratona") return 250;
	if (config.modo === "palavras") return config.palavras;
	return 120;
}

function gerarTexto() {
	citacaoAtual = null;
	const modo = modoEfetivo();
	if (modo === "zen") return [""];
	if (modo === "citacao") {
		const lista = (CITACOES[config.idioma] || CITACOES.pt).filter((c) => c.tamanho === config.citacao);
		citacaoAtual = sortear(lista.length ? lista : CITACOES[config.idioma] || CITACOES.pt);
		return citacaoAtual.texto.split(" ");
	}
	return gerarPalavras(quantidadeInicial());
}

/* -------------------------------------------------------------- desenho */

function desenharPalavra(i) {
	const el = elsPalavras[i];
	if (!el) return;
	const alvo = palavras[i];
	const dig = digitadas[i] ?? "";
	el.textContent = "";
	for (let j = 0; j < alvo.length; j++) {
		const letra = document.createElement("span");
		letra.className = "letra";
		letra.textContent = alvo[j];
		if (j < dig.length) letra.classList.add(dig[j] === alvo[j] ? "correta" : "errada");
		el.append(letra);
	}
	for (let j = alvo.length; j < dig.length; j++) {
		const letra = document.createElement("span");
		letra.className = "letra extra";
		letra.textContent = dig[j];
		el.append(letra);
	}
	// Palavra vazia (o começo do zen) precisa de altura mesmo assim, senão o
	// cursor não tem onde se apoiar.
	if (!el.childElementCount) el.append(Object.assign(document.createElement("span"), { className: "letra vazia", textContent: "​" }));
}

function acrescentarPalavras(lista) {
	const inicioIndice = palavras.length;
	palavras.push(...lista);
	const frag = document.createDocumentFragment();
	for (let i = inicioIndice; i < palavras.length; i++) {
		const el = document.createElement("div");
		el.className = "palavra";
		elsPalavras[i] = el;
		frag.append(el);
	}
	trilho.append(frag);
	for (let i = inicioIndice; i < palavras.length; i++) desenharPalavra(i);
}

function medirLinha() {
	const el = elsPalavras[0];
	if (!el) return;
	const cs = getComputedStyle(el);
	alturaLinha = el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
	janela.style.setProperty("--altura-linha", `${alturaLinha}px`);
}

// O cursor vai pra frente da próxima letra a digitar — ou pro fim da palavra,
// se ela já foi toda digitada (ou passou do tamanho, com letras extras).
function posicionar(alvoCursor, indicePalavra, indiceLetra) {
	const el = elsPalavras[indicePalavra];
	if (!el) {
		alvoCursor.hidden = true;
		return;
	}
	const letras = el.children;
	let x;
	let y;
	let h;
	if (indiceLetra < letras.length && !letras[indiceLetra].classList.contains("vazia")) {
		const l = letras[indiceLetra];
		x = l.offsetLeft;
		y = l.offsetTop;
		h = l.offsetHeight;
	} else {
		const l = letras[letras.length - 1];
		x = l.offsetLeft + (l.classList.contains("vazia") ? 0 : l.offsetWidth);
		y = l.offsetTop;
		h = l.offsetHeight;
	}
	alvoCursor.hidden = false;
	alvoCursor.style.transform = `translate(${x}px, ${y}px)`;
	alvoCursor.style.height = `${h}px`;
}

// Mantém a palavra atual na segunda linha, como o monkeytype: o texto sobe uma
// linha quando a pessoa chega na terceira. Feito com translate no trilho, sem
// tirar palavra do DOM — assim o backspace ainda alcança a linha de cima.
function rolarLinhas() {
	const el = elsPalavras[atual];
	if (!el || !alturaLinha) return;
	const linha = Math.round(el.offsetTop / alturaLinha);
	const alvo = Math.max(0, linha - 1) * alturaLinha;
	if (alvo !== deslocamento) {
		deslocamento = alvo;
		trilho.style.transform = `translateY(${-deslocamento}px)`;
	}
}

function atualizarTela() {
	for (const el of trilho.querySelectorAll(".palavra.atual")) el.classList.remove("atual");
	elsPalavras[atual]?.classList.add("atual");
	posicionar(cursor, atual, (digitadas[atual] ?? "").length);
	rolarLinhas();
}

/* --------------------------------------------------------------- contas */

function contar() {
	let corretos = 0;
	let errados = 0;
	let extras = 0;
	let faltando = 0;
	let charsCertos = 0;
	let todos = 0;
	const limite = Math.min(atual, palavras.length - 1);
	for (let i = 0; i <= limite; i++) {
		const alvo = palavras[i];
		const dig = digitadas[i] ?? "";
		const fechada = i < atual || terminado;
		todos += dig.length;
		for (let j = 0; j < Math.min(alvo.length, dig.length); j++) {
			if (dig[j] === alvo[j]) corretos++;
			else errados++;
		}
		if (dig.length > alvo.length) extras += dig.length - alvo.length;
		if (fechada && dig.length < alvo.length) faltando += alvo.length - dig.length;
		if (dig === alvo && dig) charsCertos += alvo.length;
		else if (!fechada && alvo.startsWith(dig)) charsCertos += dig.length;
	}
	return { corretos, errados, extras, faltando, charsCertos, todos: todos + atual };
}

function segundos() {
	return iniciado ? (performance.now() - inicio) / 1000 : 0;
}

function velocidades(s = segundos()) {
	const min = Math.max(s, 1) / 60;
	const c = contar();
	return {
		wpm: (c.charsCertos + espacosCertos) / 5 / min,
		raw: c.todos / 5 / min,
	};
}

function precisao() {
	if (!teclas.total) return 100;
	return ((teclas.total - teclas.erradas) / teclas.total) * 100;
}

// Consistência: quanto o ritmo bruto variou segundo a segundo. 100 é ritmo
// cravado. Coeficiente de variação, que é a mesma ideia do monkeytype com uma
// conta mais simples.
function consistencia() {
	const brutos = amostras.map((a) => a.raw).filter((v) => v > 0);
	if (brutos.length < 2) return null;
	const media = brutos.reduce((s, v) => s + v, 0) / brutos.length;
	const desvio = Math.sqrt(brutos.reduce((s, v) => s + (v - media) ** 2, 0) / brutos.length);
	return Math.max(0, Math.min(100, 100 * (1 - desvio / media)));
}

/* ------------------------------------------------------------- recordes */

function chaveRecorde(desafio = config.desafio) {
	const modo = modoEfetivo();
	const parametro =
		config.desafio === "maratona" ? 250 : modo === "tempo" ? config.tempo : modo === "palavras" ? config.palavras : config.citacao;
	return [modo, parametro, config.idioma, config.pontuacao ? "pont" : "", config.numeros ? "num" : "", desafio].join("|");
}

function lerRecordes() {
	try {
		return JSON.parse(localStorage.getItem(CHAVE_RECORDES) || "{}");
	} catch {
		return {};
	}
}

function gravarRecorde(wpm, acc) {
	const recordes = lerRecordes();
	const chave = chaveRecorde();
	const anterior = recordes[chave];
	if (anterior && anterior.wpm >= wpm) return { novo: false, anterior };
	recordes[chave] = { wpm, acc, data: new Date().toISOString().slice(0, 10) };
	try {
		localStorage.setItem(CHAVE_RECORDES, JSON.stringify(recordes));
	} catch {}
	return { novo: true, anterior };
}

// O fantasma corre no recorde da mesma configuração sem desafio — senão ele
// só teria recorde depois de você vencê-lo, o que não faz sentido. Sem
// recorde nenhum, corre a 60.
function velocidadeFantasma() {
	return lerRecordes()[chaveRecorde("nenhum")]?.wpm || 60;
}

/* ------------------------------------------------------- ciclo do teste */

function preparar(repetir = false) {
	clearInterval(relogio);
	cancelAnimationFrame(quadro);
	const podeRepetir = repetir && palavras.length && modoEfetivo() !== "zen";
	const texto = podeRepetir ? palavras.slice() : gerarTexto();

	palavras = [];
	digitadas = [];
	elsPalavras = [];
	atual = 0;
	iniciado = false;
	terminado = false;
	teclas = { total: 0, erradas: 0 };
	espacosCertos = 0;
	amostras = [];
	errosNoSegundo = 0;
	valorContado = "";
	deslocamento = 0;
	entrada.value = "";
	trilho.textContent = "";
	// Os cursores moram dentro do trilho — é o que dá a eles as mesmas
	// coordenadas das letras. Limpar o trilho os leva junto, então voltam aqui.
	trilho.append(cursor, fantasma);
	trilho.style.transform = "";

	acrescentarPalavras(texto);
	medirLinha();

	document.body.dataset.desafio = config.desafio;
	// O cursor pisca enquanto espera a primeira tecla e para de piscar ao
	// digitar — piscando no meio da digitação ele some justo quando se olha.
	document.body.classList.add("dig-esperando");
	area.hidden = false;
	contador.hidden = false;
	resultado.hidden = true;
	fantasma.hidden = true;
	fonte.textContent = citacaoAtual ? `— ${citacaoAtual.fonte}` : "";
	fonte.hidden = !citacaoAtual;
	regra.textContent = DESAFIOS[config.desafio]?.regra || "";

	atualizarTela();
	atualizarContador();
	entrada.focus({ preventScroll: true });
}

function comecar() {
	iniciado = true;
	document.body.classList.remove("dig-esperando");
	inicio = performance.now();
	relogio = setInterval(tique, 1000);
	quadro = requestAnimationFrame(animar);
}

function tique() {
	const s = segundos();
	const v = velocidades(s);
	amostras.push({ t: Math.round(s), wpm: v.wpm, raw: v.raw, erros: errosNoSegundo });
	errosNoSegundo = 0;
	if (modoEfetivo() === "tempo" && s >= config.tempo) terminar();
}

function animar() {
	if (!iniciado || terminado) return;
	atualizarContador();
	if (config.desafio === "fantasma") moverFantasma();
	quadro = requestAnimationFrame(animar);
}

function moverFantasma() {
	const caracteres = Math.floor((segundos() * velocidadeFantasma() * 5) / 60);
	let resto = caracteres;
	for (let i = 0; i < palavras.length; i++) {
		const tamanho = palavras[i].length + 1;
		if (resto < tamanho) {
			posicionar(fantasma, i, Math.min(resto, palavras[i].length));
			return;
		}
		resto -= tamanho;
	}
	fantasma.hidden = true;
}

function atualizarContador() {
	const modo = modoEfetivo();
	const partes = [];
	if (modo === "tempo") {
		partes.push(String(Math.max(0, Math.ceil(config.tempo - segundos()))));
	} else if (modo === "zen") {
		partes.push(`${Math.floor(segundos())}s`);
	} else {
		partes.push(`${atual}/${palavras.length}`);
	}
	if (iniciado && segundos() >= 1) partes.push(`${Math.round(velocidades().wpm)} wpm`);
	if (config.desafio === "fantasma") partes.push(`fantasma ${Math.round(velocidadeFantasma())}`);
	contador.textContent = partes.join("   ");
}

function terminar(falhou = false) {
	if (terminado) return;
	terminado = true;
	clearInterval(relogio);
	cancelAnimationFrame(quadro);
	// O último segundo, quebrado, também entra no gráfico.
	const s = segundos();
	if (s - (amostras.at(-1)?.t || 0) > 0.3) {
		const v = velocidades(s);
		amostras.push({ t: Math.round(s * 10) / 10, wpm: v.wpm, raw: v.raw, erros: errosNoSegundo });
	}
	mostrarResultado(falhou);
}

/* ----------------------------------------------------------- resultado */

function grafico() {
	const svgNS = "http://www.w3.org/2000/svg";
	const L = 600;
	const A = 160;
	const max = Math.max(10, ...amostras.map((a) => Math.max(a.wpm, a.raw)));
	const ultimo = Math.max(1, amostras.at(-1)?.t || 1);
	const x = (t) => (t / ultimo) * L;
	const y = (v) => A - (v / max) * (A - 10);

	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("viewBox", `0 0 ${L} ${A}`);
	svg.setAttribute("class", "dig-grafico");
	svg.setAttribute("role", "img");
	svg.setAttribute("aria-label", "velocidade ao longo do teste");

	const linha = (campo, classe) => {
		const p = document.createElementNS(svgNS, "polyline");
		p.setAttribute("points", amostras.map((a) => `${x(a.t)},${y(a[campo])}`).join(" "));
		p.setAttribute("class", classe);
		svg.append(p);
	};
	linha("raw", "dig-grafico-raw");
	linha("wpm", "dig-grafico-wpm");

	for (const a of amostras) {
		if (!a.erros) continue;
		const c = document.createElementNS(svgNS, "circle");
		c.setAttribute("cx", x(a.t));
		c.setAttribute("cy", y(Math.max(a.wpm, a.raw)) - 8);
		c.setAttribute("r", String(Math.min(6, 2 + a.erros)));
		c.setAttribute("class", "dig-grafico-erro");
		svg.append(c);
	}
	return svg;
}

function mostrarResultado(falhou) {
	const s = segundos();
	const v = velocidades(s);
	const acc = precisao();
	const c = contar();
	const cons = consistencia();
	const modo = modoEfetivo();
	const conta = !falhou && modo !== "zen" && s >= 1;
	const recorde = conta ? gravarRecorde(v.wpm, acc) : null;

	resultado.textContent = "";
	const bloco = (rotulo, valor, classe = "") => {
		const el = document.createElement("div");
		el.className = `dig-numero ${classe}`.trim();
		el.append(Object.assign(document.createElement("span"), { className: "dig-numero-rotulo", textContent: rotulo }));
		el.append(Object.assign(document.createElement("span"), { className: "dig-numero-valor", textContent: valor }));
		return el;
	};

	const principal = document.createElement("div");
	principal.className = "dig-principal";
	principal.append(bloco("wpm", String(Math.round(v.wpm)), "grande"), bloco("precisão", `${Math.round(acc)}%`, "grande"));
	resultado.append(principal);

	if (falhou) {
		resultado.append(Object.assign(document.createElement("p"), { className: "dig-falhou", textContent: "desafio falhou — um erro e acabou." }));
	} else if (recorde?.novo) {
		const antes = recorde.anterior ? ` (antes: ${Math.round(recorde.anterior.wpm)})` : "";
		resultado.append(Object.assign(document.createElement("p"), { className: "dig-recorde", textContent: `novo recorde!${antes}` }));
	}

	resultado.append(grafico());

	const detalhes = document.createElement("div");
	detalhes.className = "dig-detalhes";
	const nomeModo =
		config.desafio === "maratona"
			? "maratona"
			: modo === "tempo"
				? `tempo ${config.tempo}s`
				: modo === "palavras"
					? `${config.palavras} palavras`
					: modo === "citacao"
						? `citação ${MODOS.citacao.nomes[config.citacao] || config.citacao}`
						: "zen";
	const caracteres = bloco("caracteres", `${c.corretos}/${c.errados}/${c.extras}/${c.faltando}`);
	caracteres.title = "corretos / errados / extras / faltando";
	detalhes.append(
		bloco("bruto", String(Math.round(v.raw))),
		bloco("consistência", cons === null ? "—" : `${Math.round(cons)}%`),
		caracteres,
		bloco("tempo", `${Math.round(s)}s`),
		bloco("teste", `${nomeModo} · ${config.idioma}${config.desafio !== "nenhum" ? ` · ${DESAFIOS[config.desafio].nome}` : ""}`)
	);
	resultado.append(detalhes);

	const acoes = document.createElement("div");
	acoes.className = "dig-acoes-resultado";
	acoes.append(
		Object.assign(document.createElement("button"), { type: "button", id: "dig-proximo", textContent: "próximo (tab)" }),
		Object.assign(document.createElement("button"), { type: "button", id: "dig-repetir", textContent: "repetir o mesmo texto" })
	);
	resultado.append(acoes);

	area.hidden = true;
	contador.hidden = true;
	resultado.hidden = false;
	// O foco continua no input escondido: é ele que ouve o Tab pro próximo.
	entrada.focus({ preventScroll: true });
}

/* -------------------------------------------------------------- entrada */

// Conta as teclas pela diferença entre o que estava no campo e o que está
// agora. Só conta o que foi acrescentado; apagar não é tecla certa nem errada.
function contarDiferenca(valor) {
	const alvo = palavras[atual] ?? "";
	if (valor.length > valorContado.length) {
		for (let j = valorContado.length; j < valor.length; j++) {
			if (!iniciado) comecar();
			teclas.total++;
			const certo = modoEfetivo() === "zen" || valor[j] === alvo[j];
			if (!certo) {
				teclas.erradas++;
				errosNoSegundo++;
				if (som.somErro) tocarErro(som.volume);
				if (config.desafio === "sem-errar") {
					digitadas[atual] = valor;
					desenharPalavra(atual);
					terminar(true);
					return false;
				}
			}
		}
	}
	valorContado = valor;
	return true;
}

function fecharPalavra() {
	const dig = digitadas[atual] ?? "";
	if (!dig) return;
	const certa = dig === palavras[atual];
	if (certa) espacosCertos++;
	elsPalavras[atual].classList.toggle("com-erro", !certa);
	elsPalavras[atual].classList.add("feita");
	if (!iniciado) comecar();
	teclas.total++;

	const modo = modoEfetivo();
	if (modo === "zen") {
		atual++;
		acrescentarPalavras([""]);
	} else {
		atual++;
		if (atual >= palavras.length) {
			if (modo === "tempo") acrescentarPalavras(gerarPalavras(60));
			else {
				terminar();
				return;
			}
		}
		// Tempo: mais palavras antes de a pessoa chegar no fim do bloco.
		if (modo === "tempo" && palavras.length - atual < 40) acrescentarPalavras(gerarPalavras(60));
	}
	entrada.value = "";
	valorContado = "";
	atualizarTela();
}

function aoDigitar(evento) {
	if (terminado) {
		entrada.value = "";
		return;
	}
	let valor = entrada.value;

	// Teclado de celular manda o espaço pelo `input`, não pelo keydown. Então o
	// espaço é tratado aqui também: o que vem antes dele fecha a palavra.
	if (valor.includes(" ")) {
		const [antes, ...resto] = valor.split(" ");
		if (contarDiferenca(antes)) {
			digitadas[atual] = antes;
			if (modoEfetivo() === "zen") palavras[atual] = antes;
			desenharPalavra(atual);
			fecharPalavra();
			entrada.value = resto.join(" ").trimStart();
		}
		return;
	}

	// Durante a composição de acento (´ + e) o valor tem um caractere
	// provisório: desenha, mas só conta quando a composição fechar.
	if (!evento.isComposing && !contarDiferenca(valor)) return;

	digitadas[atual] = valor;
	if (modoEfetivo() === "zen") palavras[atual] = valor;
	desenharPalavra(atual);
	atualizarTela();

	// Última palavra digitada certa: acabou, sem precisar de espaço.
	const modo = modoEfetivo();
	if ((modo === "palavras" || modo === "citacao") && atual === palavras.length - 1 && valor === palavras[atual]) {
		elsPalavras[atual].classList.add("feita");
		atual++;
		terminar();
	}
}

function aoTeclar(evento) {
	// Som primeiro, e em toda tecla menos as modificadoras sozinhas.
	if (!evento.repeat && !["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(evento.key)) {
		tocarTecla(som.som, som.volume, tipoDaTecla(evento.code), "desce");
	}

	if (evento.key === "Tab") {
		evento.preventDefault();
		preparar();
		return;
	}
	// O Tab reinicia, então sozinho ele prenderia quem navega por teclado aqui
	// dentro. O Esc solta o foco, e aí o Tab volta a andar pela página.
	if (evento.key === "Escape") {
		entrada.blur();
		return;
	}
	if (terminado) return;

	if (evento.key === "Enter") {
		evento.preventDefault();
		if (modoEfetivo() === "zen" && evento.shiftKey && iniciado) terminar();
		return;
	}

	if (evento.key === " ") {
		evento.preventDefault();
		fecharPalavra();
		return;
	}

	if (evento.key === "Backspace" || evento.key === "Delete") {
		if (config.desafio === "sem-voltar") {
			evento.preventDefault();
			return;
		}
		// Campo vazio: volta pra palavra anterior, mas só se ela tiver erro. A
		// certa já está fechada — é a regra do monkeytype, e evita apagar o
		// texto todo sem querer segurando o backspace.
		if (evento.key === "Backspace" && entrada.value === "" && atual > 0) {
			const anterior = atual - 1;
			if (digitadas[anterior] !== palavras[anterior] && modoEfetivo() !== "zen") {
				evento.preventDefault();
				atual = anterior;
				elsPalavras[atual].classList.remove("com-erro", "feita");
				entrada.value = digitadas[atual] ?? "";
				valorContado = entrada.value;
				atualizarTela();
			}
		}
	}
}

function aoSoltar(evento) {
	if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(evento.key)) return;
	tocarTecla(som.som, som.volume, tipoDaTecla(evento.code), "sobe");
}

entrada.addEventListener("input", aoDigitar);
entrada.addEventListener("compositionend", () => {
	if (terminado) return;
	if (!contarDiferenca(entrada.value)) return;
	digitadas[atual] = entrada.value;
	desenharPalavra(atual);
	atualizarTela();
});
entrada.addEventListener("keydown", aoTeclar);
entrada.addEventListener("keyup", aoSoltar);

// Foco: o aviso de "clique pra focar" aparece quando o input perde o foco no
// meio do teste. Qualquer tecla de caractere fora de um campo traz o foco de
// volta — e a própria tecla já cai no input.
entrada.addEventListener("focus", () => document.body.classList.remove("dig-sem-foco"));
entrada.addEventListener("blur", () => document.body.classList.add("dig-sem-foco"));
area.addEventListener("click", () => entrada.focus({ preventScroll: true }));
resultado.addEventListener("click", (e) => {
	if (!e.target.closest("button")) entrada.focus({ preventScroll: true });
});
document.addEventListener("keydown", (e) => {
	if (document.activeElement === entrada) return;
	if (e.target.closest?.("input, select, textarea, button")) return;
	if (e.key.length === 1 || e.key === "Tab") {
		if (e.key === "Tab") {
			e.preventDefault();
			preparar();
			return;
		}
		entrada.focus({ preventScroll: true });
	}
});

// Mudar o tamanho da janela mexe na quebra de linha: remede e reposiciona.
let esperaRedimensionar = null;
window.addEventListener("resize", () => {
	clearTimeout(esperaRedimensionar);
	esperaRedimensionar = setTimeout(() => {
		medirLinha();
		deslocamento = -1;
		atualizarTela();
	}, 120);
});

/* ----------------------------------------------------------- opções */

// Ícones em SVG de traço, desenhados aqui: são sete, pequenos, e herdam a cor
// do texto (currentColor) — acompanham o tema e o estado ativo sozinhos. São
// constantes deste arquivo, então entrar por innerHTML não abre porta nenhuma.
const ICONES = {
	tempo: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.4 1.6"/>',
	palavras: '<path d="M3 13.2 8 2.8l5 10.4M5 9.4h6"/>',
	citacao: '<path d="M2.8 12.6V9h3.6v3.6H2.8ZM2.8 9c0-2.8 1-4.4 3.4-5.4M9.6 12.6V9h3.6v3.6H9.6ZM9.6 9c0-2.8 1-4.4 3.4-5.4"/>',
	zen: '<path d="M8 3.2 14 13H2Z"/>',
	globo: '<circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c2 2.1 2.6 4 2.6 6.2S10 12.1 8 14.2M8 1.8C6 3.9 5.4 5.8 5.4 8S6 12.1 8 14.2"/>',
	reiniciar: '<path d="M13.2 8a5.2 5.2 0 1 1-1.7-3.9"/><path d="M13.2 2.4v3.4H9.8"/>',
};

function icone(nome) {
	const span = document.createElement("span");
	span.className = "dig-ic";
	span.setAttribute("aria-hidden", "true");
	span.innerHTML = `<svg viewBox="0 0 16 16">${ICONES[nome]}</svg>`;
	return span;
}

const NOMES_IDIOMA = { pt: "português", en: "english" };
// O controle da gaveta de ajustes (teclas-config.js). Nasce quando o
// montarAjustes termina — até lá o botão não faz nada, por um instante.
let gaveta = null;

// Cada grupo é uma pílula separada, como no monkeytype. O idioma não fica
// aqui: ele mora acima do texto, que é onde o monkeytype o põe.
function montarOpcoes() {
	const caixa = $("dig-opcoes");
	caixa.textContent = "";

	const grupo = (classe = "") => {
		const g = document.createElement("div");
		g.className = `dig-grupo ${classe}`.trim();
		caixa.append(g);
		return g;
	};
	const botao = (g, texto, ativo, aoClicar, nomeIcone) => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = `dig-chip${ativo ? " ativo" : ""}`;
		if (nomeIcone) b.append(icone(nomeIcone));
		b.append(texto);
		b.setAttribute("aria-pressed", String(ativo));
		b.addEventListener("click", () => {
			aoClicar();
			gravarConfig();
			montarOpcoes();
			preparar();
		});
		g.append(b);
	};

	const maratona = config.desafio === "maratona";
	const zen = config.modo === "zen";

	if (!zen && config.modo !== "citacao") {
		const extras = grupo();
		botao(extras, "@ pontuação", config.pontuacao, () => (config.pontuacao = !config.pontuacao));
		botao(extras, "# números", config.numeros, () => (config.numeros = !config.numeros));
	}

	if (!maratona) {
		const modos = grupo();
		for (const [id, m] of Object.entries(MODOS)) {
			botao(modos, m.rotulo, config.modo === id, () => (config.modo = id), id);
		}
		const m = MODOS[config.modo];
		if (m.opcoes.length) {
			const params = grupo();
			for (const op of m.opcoes) {
				const ativo = config[config.modo] === op;
				const nome = m.nomes?.[op] || `${op}${m.sufixo || ""}`;
				botao(params, nome, ativo, () => (config[config.modo] = op));
			}
		}
	}

	// Desafio e o botão dos ajustes dividem a última pílula.
	const fimDaBarra = grupo("dig-grupo-desafio");
	const rotulo = document.createElement("label");
	rotulo.className = "dig-desafio";
	rotulo.append("desafio");
	const select = document.createElement("select");
	for (const [id, d] of Object.entries(DESAFIOS)) {
		select.append(Object.assign(document.createElement("option"), { value: id, textContent: d.nome }));
	}
	select.value = config.desafio;
	select.addEventListener("change", () => {
		config.desafio = select.value;
		gravarConfig();
		montarOpcoes();
		preparar();
	});
	rotulo.append(select);
	fimDaBarra.append(rotulo);

	const ajustes = document.createElement("button");
	ajustes.type = "button";
	ajustes.className = `dig-chip teclas-botao-ajustes${gaveta?.aberta ? " ativo" : ""}`;
	ajustes.setAttribute("aria-label", "som, tema e fundo");
	ajustes.setAttribute("aria-expanded", String(Boolean(gaveta?.aberta)));
	ajustes.setAttribute("aria-controls", "teclas-ajustes");
	ajustes.append(iconeAjustes());
	ajustes.addEventListener("click", () => gaveta?.alternar());
	fimDaBarra.append(ajustes);

	// O idioma, acima do texto. No zen não existe texto pronto, então some.
	const idioma = $("dig-idioma");
	idioma.textContent = "";
	idioma.append(icone("globo"), NOMES_IDIOMA[config.idioma] || config.idioma);
	idioma.hidden = zen;
	idioma.setAttribute("aria-label", `idioma: ${NOMES_IDIOMA[config.idioma]}. clique pra trocar`);
}

$("dig-idioma").addEventListener("click", () => {
	config.idioma = config.idioma === "pt" ? "en" : "pt";
	gravarConfig();
	montarOpcoes();
	preparar();
});

/* --------------------------------------------------------------- botões */

$("dig-reiniciar").append(icone("reiniciar"));
$("dig-reiniciar").addEventListener("click", () => preparar());
document.addEventListener("click", (e) => {
	if (e.target.closest("#dig-repetir")) preparar(true);
	if (e.target.closest("#dig-proximo")) preparar();
});

/* ---------------------------------------------------------------- início */

montarAjustes($("teclas-ajustes"), (c) => {
	som = c;
}).then(() => {
	// Ao fechar, o foco volta pro texto — senão a próxima tecla ficaria
	// perdida num controle que acabou de sumir.
	gaveta = ligarGaveta($("teclas-ajustes"), {
		aoFechar: () => entrada.focus({ preventScroll: true }),
	});
});
montarOpcoes();
// Espera as fontes: medir a linha com a fonte de reserva e depois trocar pra
// ANK deixaria o cursor e a rolagem desalinhados.
(document.fonts?.ready || Promise.resolve()).then(() => preparar());
