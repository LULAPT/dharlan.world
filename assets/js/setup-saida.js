// setup-saida.js — a saída da /setup/: a boneca do canto ganha vida, solta a
// bandeira, desce das pedras e atravessa a tela por cima do terminal até
// socar a borda esquerda. O soco derruba tudo e, depois de uma pausa com ela
// sozinha na tela, vem a próxima página.
//
// Dispara pelo comando `exit` (vai pra /sobre/) e pelo link "< voltar pro site"
// (vai pra /home/). Quem dispara decide o destino; a cena é a mesma.
//
// Os movimentos dela são de verdade: o gunnm-saida-dither.webp é um WebP
// animado, feito de um vídeo gerado por IA que usou o próprio PNG dela como
// quadro inicial. O verde do fundo foi recortado, a parede que a IA inventou
// pra ela socar foi apagada e os quadros foram repontilhados no rosa do PNG.
// Toca uma vez e para no último quadro. O resto — o deslize no pulo, a queda
// do terminal, o clarão — é Web Animations API (element.animate),
// animando só transform e opacity.

const $ = (id) => document.getElementById(id);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const sorteio = (min, max) => min + Math.random() * (max - min);
const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let saindo = false;
let destinoAtual = "/home/";

// Pula a cena: qualquer tecla ou clique durante ela vai direto pro destino.
function irAgora() {
	window.location.href = destinoAtual;
}

// Acima do terminal e dos dois botões fixos (997), abaixo do clarão: durante
// a cena, ela passa na frente de tudo.
const PLANO_DA_BONECA = "998";

// Quanto ela fica sozinha na tela depois que a última peça cai.
const PAUSA_DEPOIS_DO_SOCO = 1000;

// O `clear` de mentira que roda antes da cena. Quem sabe escrever no terminal
// é o setup-comandos.js, que se registra aqui quando o prompt nasce. Antes
// disso (com o fastfetch ainda digitando), a cena começa direto.
let limparTerminal = null;
export function registrarClear(limpar) {
	limparTerminal = limpar;
}

/* ------------------------------------------------------- a animação */

// Medidas em pixels do PNG parado (718x1049): os quadros do WebP foram
// pontilhados nessa mesma escala, então o pontilhado dos dois sai do mesmo
// tamanho na tela e a troca de um pelo outro não aparece. `x` e `y` são onde
// fica o canto do WebP com o PNG em 0,0 — bem à esquerda dele, porque ela
// atravessa a tela. A borda esquerda do WebP é o corte da parede apagada, e
// é ali que o punho para.
//
// A caminhada do vídeo tem comprimento fixo, e a distância até a borda muda
// com a largura da tela. O acerto é no pulo: no ar ela desliza pra esquerda o
// que faltar, sem pé no chão pra patinar. Pra as pedras não irem junto, do
// quadro 25 em diante elas foram tiradas do WebP e viraram uma imagem parada
// à parte (`pedras`, posição em pixels do WebP), tirada do quadro 27, o
// primeiro com ela no ar.
const QUADRO = 1000 / 15;
const ANIMACAO = {
	src: "/assets/img/gunnm-saida-dither.webp",
	largura: 1741,
	altura: 1098,
	x: -1022.75,
	y: -47.56,
	pedras: {
		src: "/assets/img/gunnm-saida-pedras.webp",
		x: 471,
		y: 893,
		largura: 1270,
		altura: 204,
	},
	// As pedras paradas entram por baixo do WebP dois quadros antes de saírem
	// dele — nesse meio-tempo as do WebP, idênticas, as cobrem.
	pedrasEm: 23 * QUADRO,
	// O pulo: sai do chão no quadro 27 e aterrissa no 31. O deslize vai até o
	// 33 e desacelera, como quem escorrega um pouco ao pousar.
	pulo: 27 * QUADRO,
	pouso: 33 * QUADRO,
	// O punho encosta na borda no quadro 58.
	golpe: 58 * QUADRO,
};

function boneca() {
	const img = $("setup-gunnm");
	if (!img) return null;
	// No celular ela está escondida pelo setup.css: aí a cena é só o terminal.
	return getComputedStyle(img).display === "none" ? null : img;
}

// O WebP tem pouco mais de 1 MB, e na hora do `exit` não daria tempo de
// baixar: ele vem antes, quando a página sossega. Só onde a boneca aparece.
let animacao = null;
function imagemDaCena(classe, src) {
	const img = new Image();
	img.className = `${classe} img-clr-main`;
	img.alt = "";
	img.setAttribute("aria-hidden", "true");
	img.decoding = "async";
	img.src = src;
	return img;
}
function prepararAnimacao() {
	if (animacao || !boneca() || reduzido()) return animacao;
	prepararSom();
	animacao = {
		boneca: imagemDaCena("setup-animacao", ANIMACAO.src),
		pedras: imagemDaCena("setup-pedras", ANIMACAO.pedras.src),
	};
	return animacao;
}

// Pronta = primeiro quadro das duas imagens decodificado. Com a rede lenta
// demais, a boneca fica de fora e a cena é só o terminal caindo.
async function pronta(anim, limite) {
	try {
		await Promise.race([
			Promise.all([anim.boneca.decode(), anim.pedras.decode()]),
			esperar(limite).then(() => Promise.reject(new Error("demorou"))),
		]);
		return true;
	} catch {
		return false;
	}
}

// Espera até `ms` depois do instante `inicio` (os dois em performance.now()).
const noInstante = (inicio, ms) => esperar(inicio + ms - performance.now());

/* -------------------------------------------------------- o som do soco */

// Feito no Bfxr (o Thunderworks1.bfxr da raiz é o projeto dele), exportado em
// wav e convertido. Toca pelo Web Audio, e não por <audio>: o contexto é
// destravado no próprio Enter do `exit` ou no clique do "voltar pro site",
// e assim o Safari/iOS deixa ele soar quatro segundos depois, no soco. Um
// <audio> tocado fora do gesto o iOS recusa.
const SOM_DO_SOCO = "/assets/wav/soco-terminal.mp3";
let audio = null;
let somDoSoco = null;

function prepararSom() {
	if (audio) return;
	try {
		audio = new (window.AudioContext || window.webkitAudioContext)();
	} catch {
		return;
	}
	// Decodifica já: na hora do soco não pode haver espera. Falhou, a cena
	// segue muda.
	fetch(SOM_DO_SOCO)
		.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
		.then((dados) => audio.decodeAudioData(dados))
		.then((buffer) => (somDoSoco = buffer))
		.catch(() => {});
}

function tocarSoco() {
	if (!audio || !somDoSoco) return;
	const fonte = audio.createBufferSource();
	fonte.buffer = somDoSoco;
	fonte.connect(audio.destination);
	fonte.start();
}

/* ------------------------------------------------ 1. a boneca acorda */

// Onde o WebP fica na tela. Ele vai da borda esquerda (o soco) até a borda
// direita do PNG, então em tela larga cabe com folga: fica no lugar do PNG, e
// o que falta até a borda ela desliza no pulo. Em janela estreita ou alta
// (meia tela de um monitor grande, por exemplo) não cabe — o soco cairia fora
// da tela —, e ela encolhe no lugar até o WebP caber entre a borda e o lado
// direito de onde ela estava. Aí não sobra nada pra deslizar.
function medir(img) {
	const r = img.getBoundingClientRect();
	const escala = r.height / 1049;
	const encolhe = Math.min(1, r.right / (ANIMACAO.largura * escala));
	const e = escala * encolhe;
	const esquerda = encolhe < 1 ? 0 : r.left + ANIMACAO.x * escala;
	return {
		encolhe,
		escala: e,
		esquerda,
		topo: r.bottom - r.height * encolhe + ANIMACAO.y * e,
		// O transform-origin do PNG é o pé (setup.css): encolher não o tira do
		// chão, mas puxa as laterais pro meio — daí a conta da largura.
		ajustePng: esquerda - ANIMACAO.x * e - (r.left + (r.width * (1 - encolhe)) / 2),
	};
}

// Devolve o instante do primeiro quadro na tela — a referência pra sincronizar
// o resto. Um WebP animado só começa a tocar quando é pintado pela primeira
// vez, e o timestamp do requestAnimationFrame é justamente o desse quadro.
async function acordar(img, anim, lugar) {
	Object.assign(anim.style, {
		height: `${ANIMACAO.altura * lugar.escala}px`,
		left: `${lugar.esquerda}px`,
		top: `${lugar.topo}px`,
		width: `${ANIMACAO.largura * lugar.escala}px`,
	});

	// Sai de trás do terminal (e, se precisar, encolhe).
	img.style.zIndex = PLANO_DA_BONECA;
	if (lugar.encolhe < 1) {
		await img.animate(
			[
				{ transform: "translateX(0) scale(1)" },
				{ transform: `translateX(${lugar.ajustePng}px) scale(${lugar.encolhe})` },
			],
			{ duration: 700, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" }
		).finished;
	}

	// O WebP e as pedras moram num contêiner com a mesma opacidade do PNG
	// parado (a .setup-cena, no setup.css): o tom de rosa fica igual do começo
	// ao fim. A opacidade é do contêiner e não de cada imagem porque, nos
	// quadros em que as pedras paradas já estão por baixo das do WebP, duas
	// camadas a 0.55 somariam ~0.8 e as pedras piscariam mais claras.
	//
	// A troca é seca, no mesmo quadro: o primeiro quadro do vídeo é o próprio
	// PNG (bate com ele a 1px). Um dissolve entre duas camadas translúcidas
	// faria o tom oscilar no meio.
	const cena = document.createElement("div");
	cena.className = "setup-cena";
	cena.append(anim);
	document.body.append(cena);
	const inicio = await new Promise(requestAnimationFrame);
	img.style.visibility = "hidden";
	return inicio;
}

/* ------------------------------------------ 2. o pulo pra fora das pedras */

async function pular(anim, pedras, lugar, inicio) {
	const p = ANIMACAO.pedras;
	Object.assign(pedras.style, {
		height: `${p.altura * lugar.escala}px`,
		left: `${lugar.esquerda + p.x * lugar.escala}px`,
		top: `${lugar.topo + p.y * lugar.escala}px`,
		width: `${p.largura * lugar.escala}px`,
	});
	await noInstante(inicio, ANIMACAO.pedrasEm);
	// Antes do WebP no DOM, no mesmo plano: fica por baixo dele.
	anim.before(pedras);

	if (!lugar.esquerda) return;
	await noInstante(inicio, ANIMACAO.pulo);
	// Rápido no ar e desacelerando no pouso — quase tudo acontece antes de os
	// pés tocarem o chão.
	anim.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-lugar.esquerda}px)` }], {
		duration: ANIMACAO.pouso - ANIMACAO.pulo,
		easing: "cubic-bezier(0.2, 0.6, 0.35, 1)",
		fill: "forwards",
	});
}

/* ------------------------------------------- 3. o soco derruba tudo */

// As peças que caem: cada linha do terminal e cada bloco da saída do fetch,
// separadamente — caindo inteiro, o terminal pareceria uma placa só. Fica de
// fora o que é `display: contents` (as linhas das tabelas do bagels), porque
// transform não pega nesses; a tabela cai inteira. A engrenagem e o botão do
// rádio caem junto, e as pedras e o rádio flutuante (o do comando `radio`)
// também.
const PECAS = [
	".setup-voltar",
	".ff-linha-prompt",
	".ff-logo",
	".ff-titulo",
	".ff-divisor",
	".ff-linha",
	".ff-paleta",
	".ff-saida-texto",
	".ff-erro",
	".bagels-titulo",
	".bagels-tabela",
	".mapa > .mapa-no",
	"#settings-panel",
	"#radio-botao",
	"#web-deck-player",
	".setup-pedras",
].join(", ");

async function desabar() {
	const tela = $("setup-tela");
	// `clip` e não `hidden`: corta o que cai pra fora sem virar contêiner de
	// rolagem — senão as peças em queda esticariam a página e fariam nascer
	// barra de rolagem no meio da cena.
	tela.style.overflow = "clip";

	const altura = window.innerHeight;
	const visiveis = [];
	for (const peca of document.querySelectorAll(PECAS)) {
		// Peça já rolada pra fora da tela não precisa de queda: só some.
		const r = peca.getBoundingClientRect();
		if (r.bottom < 0 || r.top > altura) peca.style.opacity = "0";
		else visiveis.push(peca);
	}

	// O tranco do soco. No #setup-terminal e não no #setup-tela: a #setup-gunnm
	// mora dentro do #setup-tela, e um transform nele viraria a referência de
	// posição dela (que é fixed).
	$("setup-terminal").animate(
		[
			{ transform: "translateX(0)" },
			{ transform: "translateX(-12px)" },
			{ transform: "translateX(10px)" },
			{ transform: "translateX(-6px)" },
			{ transform: "translateX(3px)" },
			{ transform: "translateX(0)" },
		],
		{ duration: 220, easing: "steps(5)" }
	);
	await esperar(120);

	// A queda acelera (um "ease-in" forte), como gravidade, e cada peça sai num
	// momento e com um giro diferente. A distância é folgada de propósito — uma
	// tela e meia, de qualquer ponto de partida: calculada a partir da posição
	// medida no começo, algumas peças paravam ainda dentro da tela.
	const quedas = visiveis.map(
		(peca) =>
			peca.animate(
				[
					{ transform: "translate(0, 0) rotate(0deg)" },
					{
						transform: `translate(${sorteio(-60, 60)}px, ${altura * 1.5 + 120}px) rotate(${sorteio(-28, 28)}deg)`,
					},
				],
				{
					delay: sorteio(0, 320),
					duration: sorteio(650, 950),
					easing: "cubic-bezier(0.55, 0, 1, 0.45)",
					fill: "forwards",
				}
			).finished
	);
	return Promise.all(quedas);
}

function clarao() {
	const el = document.createElement("div");
	el.className = "setup-clarao";
	document.body.append(el);
	el.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.2 }, { opacity: 0 }], { duration: 240, fill: "forwards" });
}

/* ------------------------------------------------------------ a cena */

export async function sairDaSetup(destino) {
	if (saindo) return;
	saindo = true;
	destinoAtual = destino;

	// Ainda dentro do gesto (o Enter ou o clique): é aqui que o navegador
	// deixa o áudio destravar. Precisa vir antes de qualquer `await`.
	audio?.resume().catch(() => {});

	// Sem movimento pedido: vai direto.
	if (reduzido()) {
		irAgora();
		return;
	}

	// Depois de um instante, qualquer tecla ou clique pula a cena. O atraso não
	// é enfeite: armado na hora, este ouvinte pegaria a própria tecla Enter do
	// `exit` (o evento ainda está subindo pelo documento) e pularia na hora.
	setTimeout(() => {
		document.addEventListener("keydown", irAgora, { once: true, capture: true });
		document.addEventListener("pointerdown", irAgora, { once: true, capture: true });
	}, 300);

	const img = boneca();
	const anim = img && prepararAnimacao();
	// Enquanto o clear roda, o WebP termina de chegar (se ainda faltava).
	const carregou = anim ? pronta(anim, 2500) : Promise.resolve(false);
	await limparTerminal?.();

	// Sem a boneca (celular) ou sem o WebP a tempo: só o terminal cai.
	if (!(await carregou)) {
		await desabar();
		irAgora();
		return;
	}

	// Para o balanço de enfeite (.tilt) antes de medir: girada, a caixa dela
	// sai maior que a imagem.
	img.classList.remove("tilt");
	const lugar = medir(img);
	const inicio = await acordar(img, anim.boneca, lugar);
	pular(anim.boneca, anim.pedras, lugar, inicio);
	await noInstante(inicio, ANIMACAO.golpe);
	tocarSoco();
	clarao();
	// Tudo cai e ela fica um instante sozinha, de punho na borda, antes da
	// próxima página. Sem transição nenhuma na troca: uma cortina passando por
	// cima parecia a tela de antes sendo puxada.
	await desabar();
	await esperar(PAUSA_DEPOIS_DO_SOCO);
	irAgora();
}

/* ----------------------------------------------------------- ligações */

// O "< voltar pro site": a cena, e só depois a navegação. Ctrl/Cmd/Shift ou
// botão do meio continuam abrindo em outra aba como qualquer link.
const voltar = document.querySelector(".setup-voltar");
voltar?.addEventListener("click", (e) => {
	if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
	e.preventDefault();
	// Pra o fade-out do fade-in.js (que escuta cliques em link no document)
	// não navegar por cima da cena.
	e.stopPropagation();
	sairDaSetup(voltar.getAttribute("href"));
});

// Baixa o WebP da cena quando a página já terminou o que tinha pra fazer.
function agendarAnimacao() {
	const quandoSobrar = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
	quandoSobrar(prepararAnimacao);
}
if (document.readyState === "complete") agendarAnimacao();
else window.addEventListener("load", agendarAnimacao, { once: true });

// Voltando pelo botão do navegador, o bfcache devolve a página como ela
// estava — com o terminal no chão e a boneca parada no último quadro.
// Recarregar é o jeito de ela voltar inteira; ver a nota sobre bfcache no
// CLAUDE.md.
window.addEventListener("pageshow", (e) => {
	if (e.persisted && saindo) window.location.reload();
});
