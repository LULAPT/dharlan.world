// setup-comandos.js — o prompt que fica depois do fastfetch na /setup/.
//
// A ideia é que o terminal da página não seja só um desenho: dá pra digitar.
// São poucos comandos de propósito — isto é enfeite de página pessoal, não um
// shell. Quem monta a saída do fetch continua sendo o setup.js; este módulo só
// cuida do prompt, do teclado e do cmatrix.
//
// O teclado entra por um <input> invisível em vez de um `keydown` solto no
// documento: é o que faz o teclado do celular abrir ao tocar na tela, e é o
// que deixa acentuação e IME funcionarem. O que o visitante vê é o <span> com
// o texto espelhado do input, porque o input de verdade não dá pra estilizar
// com o cursor em bloco.

import { criarBagels } from "./setup-bagels.js";
import { montarSitemap } from "./setup-sitemap.js";
import { registrarClear, sairDaSetup } from "./setup-saida.js";

// Os três ajudantes do setup.js chegam por parâmetro em vez de `import`: o
// setup.js já importa este arquivo, e importar de volta fecharia um ciclo entre
// os dois módulos. Sentido único é mais fácil de seguir. (O setup-bagels.js é
// folha, não importa ninguém, então nele o `import` normal serve.)

const DICA = 'digite "help" pra ver os comandos';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// O `radio`: o mesmo player flutuante que acompanha quem sai da /radio/,
// montado aqui sem precisar passar por lá. Import sob demanda, como no main.js
// — quem nunca digita o comando não baixa o rádio.
async function ligarRadio() {
	const { lerEstado, setDestacado } = await import("./radio.js");
	setDestacado(true);
	// Já nasce tocando: o Enter do comando é o gesto que o navegador pede pra
	// deixar sair som. Se ele barrar mesmo assim, o player pisca pedindo um
	// clique (ver o bloqueadoPorAutoplay no radio.js).
	try {
		localStorage.setItem("radio-estado", JSON.stringify({ ...lerEstado(), tocando: true }));
	} catch {}
	const { iniciarRadioMini } = await import("./radio-mini.js");
	await iniciarRadioMini();
}

// Quanto da tela o rastro do cmatrix apaga por quadro. Baixo demais e o rastro
// nunca some; alto demais e vira chuva sem cauda.
const CMATRIX_APAGADO = 0.07;
const CMATRIX_CORPO = 16;
// O cmatrix de verdade desenha com o conjunto estreito do terminal e cor
// única; o unimatrix é o clone em Python que usa unicode mais largo e acende o
// caractere da ponta de cada coluna. É essa a diferença entre os dois aqui.
const CHUVAS = {
	cmatrix: {
		glifos: "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789",
		pontaAcesa: false,
	},
	unimatrix: {
		glifos:
			"ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ" +
			"0123456789" +
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
			"ｦｧｨｩｪｫｬｭｮｯｰ:・.=*+-<>¦｜╌" +
			"αβγδεζηθικλμνξπρστυφχψω",
		pontaAcesa: true,
	},
};

function corDoTema(variavel, reserva) {
	const valor = getComputedStyle(document.documentElement)
		.getPropertyValue(variavel)
		.trim();
	return valor || reserva;
}

/* ---------------------------------------------------------------- cmatrix */

// Roda por cima de tudo, menos da engrenagem e do botão do rádio (z-index 997,
// no setup.css): sair daqui não pode custar o acesso ao resto da página.
function rodarChuva(criar, receita, aoSair) {
	const tela = document.createElement("canvas");
	tela.id = "setup-cmatrix";
	document.body.appendChild(tela);

	const aviso = criar("div", "setup-cmatrix-aviso", "qualquer tecla pra sair");
	document.body.appendChild(aviso);

	const ctx = tela.getContext("2d");
	const fundo = corDoTema("--clr-black-a0", "#000");
	const frente = corDoTema("--clr-main-a40", "#ff6fae");
	const ponta = corDoTema("--clr-white", "#fff");

	let colunas = 0;
	let gotas = [];

	function medir() {
		tela.width = window.innerWidth;
		tela.height = window.innerHeight;
		colunas = Math.ceil(tela.width / CMATRIX_CORPO);
		// Cada coluna começa numa altura sorteada, senão a chuva desce toda
		// alinhada, como uma cortina.
		gotas = Array.from({ length: colunas }, () =>
			Math.floor((Math.random() * -tela.height) / CMATRIX_CORPO)
		);
	}

	medir();
	window.addEventListener("resize", medir);

	let quadro = 0;
	function desenhar() {
		// Retângulo quase transparente por cima do quadro anterior: é o que faz
		// o rastro desbotar em vez de a tela limpar de uma vez.
		ctx.globalAlpha = CMATRIX_APAGADO;
		ctx.fillStyle = fundo;
		ctx.fillRect(0, 0, tela.width, tela.height);
		ctx.globalAlpha = 1;

		ctx.font = `${CMATRIX_CORPO}px "VT323", monospace`;

		for (let i = 0; i < colunas; i++) {
			const glifo =
				receita.glifos[Math.floor(Math.random() * receita.glifos.length)];
			// A ponta acesa do unimatrix: só o caractere que está caindo agora sai
			// na cor do texto; o rastro atrás dele já é o desbotamento do fundo.
			ctx.fillStyle = receita.pontaAcesa ? ponta : frente;
			ctx.fillText(glifo, i * CMATRIX_CORPO, gotas[i] * CMATRIX_CORPO);
			if (receita.pontaAcesa) {
				ctx.fillStyle = frente;
				ctx.fillText(
					receita.glifos[Math.floor(Math.random() * receita.glifos.length)],
					i * CMATRIX_CORPO,
					(gotas[i] - 1) * CMATRIX_CORPO
				);
			}

			// Reinicia a coluna lá em cima quando ela passa do fim, mas só às
			// vezes — é o sorteio que dessincroniza as colunas umas das outras.
			if (gotas[i] * CMATRIX_CORPO > tela.height && Math.random() > 0.975) {
				gotas[i] = 0;
			}
			gotas[i]++;
		}

		quadro = requestAnimationFrame(desenhar);
	}

	quadro = requestAnimationFrame(desenhar);

	function sair() {
		cancelAnimationFrame(quadro);
		window.removeEventListener("resize", medir);
		document.removeEventListener("keydown", sair, true);
		document.removeEventListener("pointerdown", sair, true);
		tela.remove();
		aviso.remove();
		aoSair();
	}

	// Na fase de captura pra pegar a tecla antes do input do prompt — senão o
	// caractere que encerra o cmatrix ainda apareceria digitado na linha.
	document.addEventListener("keydown", sair, true);
	document.addEventListener("pointerdown", sair, true);
}

/* ----------------------------------------------------------------- prompt */

export function iniciarComandos({
	tela,
	dados,
	textoPrompt,
	criar,
	montarPrompt,
	montarSaida,
}) {
	let linhaAtiva = null;
	let entrada = null;
	let dicaUsada = false;
	let travado = false;

	// Quem rola nesta página é o <body>, não o documento: o style.css global põe
	// `height: 100%` no html e no body e `overflow-y: scroll` no body. Com isso
	// o documento fica preso na altura do viewport e `window.scrollTo()` não faz
	// absolutamente nada aqui. Daí procurar o contêiner de rolagem em vez de
	// chutar um — se a regra global mudar de elemento um dia, isto continua
	// achando o certo.
	function caixaDeRolagem(elemento) {
		for (let no = elemento?.parentElement; no; no = no.parentElement) {
			const estilo = getComputedStyle(no);
			if (/(auto|scroll)/.test(estilo.overflowY) && no.scrollHeight > no.clientHeight) {
				return no;
			}
		}
		return document.scrollingElement || document.documentElement;
	}

	// Até o fim de tudo, e não só até a linha aparecer: o `padding-bottom: 5rem`
	// do #setup-tela existe justamente pra o prompt não parar embaixo da
	// engrenagem e do botão do rádio, que são fixos no canto inferior esquerdo.
	// Um scrollIntoView({ block: "end" }) encostaria a linha na borda de baixo,
	// bem em cima deles.
	function rolarProFim() {
		const caixa = caixaDeRolagem(linhaAtiva);
		// `instant` na marra: o style.css global tem `scroll-behavior: smooth`,
		// e terminal não desliza — pula.
		caixa.scrollTo({ top: caixa.scrollHeight, behavior: "instant" });
	}

	function imprimir(texto, classe = "ff-saida-texto") {
		tela.appendChild(criar("div", classe, texto));
	}

	// A linha onde se digita: prompt, o texto espelhado do input, o cursor e a
	// dica. O <input> fica junto (invisível) pra o foco não sair do lugar.
	function novaLinha() {
		const linha = montarPrompt(textoPrompt);
		linha.classList.add("ff-linha-entrada");

		const digitado = criar("span", "ff-digitado");
		const cursor = criar("span", "ff-cursor", "▋");
		const dica = criar("span", "ff-dica", DICA);
		if (dicaUsada) dica.hidden = true;

		entrada = document.createElement("input");
		entrada.id = "setup-entrada";
		entrada.type = "text";
		entrada.autocomplete = "off";
		entrada.autocapitalize = "off";
		entrada.spellcheck = false;
		entrada.setAttribute("aria-label", "linha de comando");

		entrada.addEventListener("input", () => {
			digitado.textContent = entrada.value;
			dica.hidden = dicaUsada || entrada.value.length > 0;
		});

		entrada.addEventListener("keydown", (evento) => {
			if (evento.key !== "Enter" || travado) return;
			evento.preventDefault();
			executar(entrada.value);
		});

		linha.append(digitado, cursor, dica, entrada);
		tela.appendChild(linha);
		linhaAtiva = linha;
		entrada.focus({ preventScroll: true });
		rolarProFim();
	}

	// Congela a linha atual: o input sai, o cursor para de piscar e sobra o
	// texto do comando, como numa rolagem de terminal de verdade.
	function fecharLinha() {
		if (!linhaAtiva) return;
		linhaAtiva.querySelector(".ff-cursor")?.remove();
		linhaAtiva.querySelector(".ff-dica")?.remove();
		linhaAtiva.querySelector("input")?.remove();
		linhaAtiva.classList.remove("ff-linha-entrada");
		linhaAtiva = null;
		entrada = null;
	}

	const COMANDOS = {
		help: {
			descricao: "esta lista",
			rodar() {
				const lista = criar("div", "ff-ajuda");
				for (const [nome, cmd] of Object.entries(COMANDOS)) {
					const item = criar("div", "ff-linha");

					// O ">" entra como elemento separado, não colado no texto do nome:
					// assim ele fica apagado e o comando segue na cor do tema, que é o
					// que faz a lista ler como "estes aqui são comandos".
					const rotulo = criar("span", "ff-rotulo");
					rotulo.append(criar("span", "ff-seta", ">"), document.createTextNode(nome));

					item.appendChild(rotulo);
					item.appendChild(criar("span", "ff-valor", cmd.descricao));
					lista.appendChild(item);
				}
				tela.appendChild(lista);
			},
		},
		fastfetch: {
			descricao: "imprime as specs de novo",
			rodar() {
				tela.appendChild(montarSaida(dados));
			},
		},
		cmatrix: {
			descricao: "chuva de caracteres (qualquer tecla sai)",
			rodar: () => chover("cmatrix"),
		},
		unimatrix: {
			descricao: "a mesma chuva, com unicode e a ponta acesa",
			rodar: () => chover("unimatrix"),
		},
		bagels: {
			descricao: "controle de gastos em tela cheia (bagels help pra ver tudo)",
			rodar: (args) => bagels(args),
		},
		sitemap: {
			descricao: "a árvore do site, igual à da /sitemap/",
			rodar: () => montarSitemap({ tela, imprimir }),
		},
		radio: {
			descricao: "liga o rádio aqui mesmo, flutuando no canto da tela",
			rodar() {
				if (document.getElementById("web-deck-player")) {
					imprimir("radio: já está ligado, no canto inferior direito");
					return;
				}
				// A resposta sai na hora, e o player chega logo depois: a linha não
				// pode esperar o YouTube, senão o prompt novo ficaria preso.
				imprimir("radio: sintonizando... o player aparece no canto inferior direito");
				ligarRadio().catch((erro) => console.error("radio:", erro));
			},
		},
		clear: {
			descricao: "limpa o terminal",
			rodar() {
				tela.textContent = "";
			},
		},
		// O prompt não volta: a cena da saída termina navegando pra /home/.
		exit: {
			descricao: "sai do terminal e volta pro site (/home/)",
			rodar: () => suspender(() => sairDaSetup()),
		},
	};

	const bagels = criarBagels({ criar, imprimir, tela, suspender });

	// O exit e o "voltar pro site" passam por aqui antes da cena da saída: um
	// `clear` digitado e rodado, como se o terminal se limpasse pra ela passar.
	// Mesma velocidade da digitação do fastfetch no setup.js.
	registrarClear(async () => {
		travado = true;
		let digitado;
		if (linhaAtiva) {
			// O "voltar pro site" chega com o prompt aberto: o que estiver
			// escrito nele dá lugar ao clear.
			linhaAtiva.querySelector(".ff-dica")?.remove();
			linhaAtiva.querySelector("input")?.remove();
			digitado = linhaAtiva.querySelector(".ff-digitado");
			digitado.textContent = "";
		} else {
			// O exit já fechou a linha dele: o clear ganha uma nova.
			linhaAtiva = montarPrompt(textoPrompt);
			digitado = criar("span", "ff-digitado");
			linhaAtiva.append(digitado, criar("span", "ff-cursor", "▋"));
			tela.appendChild(linhaAtiva);
		}
		rolarProFim();
		for (const caractere of "clear") {
			digitado.textContent += caractere;
			await esperar(70);
		}
		await esperar(260);

		// Limpo, sobra só o prompt no topo, com o cursor piscando.
		tela.textContent = "";
		const limpo = montarPrompt(textoPrompt);
		limpo.append(criar("span", "ff-cursor", "▋"));
		tela.appendChild(limpo);
		linhaAtiva = null;
		entrada = null;
		await esperar(400);
	});

	// Para o prompt enquanto algo toma a tela (a chuva, o bagels) e devolve
	// ele quando esse algo sai. O "sem-prompt" avisa o executar() pra não
	// desenhar uma linha nova agora — quem desenha é o retomar.
	function suspender(iniciar) {
		travado = true;
		iniciar(() => {
			travado = false;
			novaLinha();
		});
		return "sem-prompt";
	}

	function chover(qual) {
		return suspender((retomar) => rodarChuva(criar, CHUVAS[qual], retomar));
	}

	function executar(bruto) {
		const comando = bruto.trim();
		fecharLinha();

		if (!comando) {
			novaLinha();
			return;
		}

		// Argumentos entre aspas viram um pedaço só, como em qualquer shell:
		// `bagels add -25 comida "pastel de feira"`.
		const pedacos =
			comando.match(/"[^"]*"|'[^']*'|[^ ]+/g)?.map((p) => p.replace(/^["']|["']$/g, "")) || [];
		const [nome, ...args] = pedacos;
		if (!nome) {
			novaLinha();
			return;
		}

		const alvo = COMANDOS[nome.toLowerCase()];
		if (!alvo) {
			imprimir(`bash: ${nome}: comando não encontrado`, "ff-erro");
			dicaUsada = true;
			novaLinha();
			return;
		}

		const resultado = alvo.rodar(args);
		dicaUsada = true;
		if (resultado !== "sem-prompt") novaLinha();
	}

	// Num terminal de verdade não existe "onde clicar" — a janela inteira é o
	// terminal. Então o ouvinte fica no documento, não só no #setup-terminal.
	//
	// Só com mouse: no celular isso faria o teclado subir a cada toque em
	// qualquer canto da página. O teste é por capacidade de ponteiro e não por
	// largura, porque o que importa aqui é ter cursor, não ter tela grande.
	const comMouse = window.matchMedia("(hover: hover) and (pointer: fine)");

	// `click` e não `mousedown`: no mousedown seria preciso `preventDefault()`
	// pra o foco não escapar, e isso, no documento inteiro, impediria selecionar
	// texto arrastando. No click a seleção já aconteceu e dá pra respeitá-la.
	document.addEventListener("click", (evento) => {
		if (travado || !entrada || !comMouse.matches) return;
		// Link, botão, campo, a engrenagem e o rádio têm clique próprio.
		if (
			evento.target.closest(
				"a, button, input, select, textarea, label, #settings-panel, #web-deck-player"
			)
		) {
			return;
		}
		// Selecionou texto: o foco é de quem está copiando, não do prompt.
		if (window.getSelection()?.toString()) return;
		entrada.focus({ preventScroll: true });
	});

	novaLinha();
}
