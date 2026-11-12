// boot-terminal.js
// Terminal de boot exibido antes do conteúdo da /index.
// Baseado em https://github.com/HairyDuck/terminal (MIT, atribuição
// mantida aqui já que o link não é mais mostrado na tela).

document.addEventListener("DOMContentLoaded", () => {
	const bootTerminal = document.getElementById("boot-terminal");
	const output = document.getElementById("boot-output");
	if (!bootTerminal || !output) return;

	// Quem tem overflow-y: auto é a .terminal; o #boot-output só cresce dentro
	// dela. Mexer no scrollTop do #boot-output não fazia nada, e por isso as
	// linhas novas saíam da tela sem a view acompanhar — visível no celular,
	// onde a barra do navegador come altura e sobra pouca tela.
	const caixaDeRolagem = output.closest(".terminal") || output;
	function rolarPraBaixo() {
		caixaDeRolagem.scrollTop = caixaDeRolagem.scrollHeight;
	}

	// A engrenagem e o botão do rádio ficam acima do boot (z-index 997 contra
	// 900), o que é de propósito: na tela do captcha dá pra trocar o tema antes
	// de entrar. Mas depois que a sequência começa eles viram enfeite — o CSS
	// os apaga e marca com um X, e aqui o clique é recusado, pra ninguém pular
	// o boot indo direto pra /radio/.
	const ATALHOS = "#settings-panel, #radio-botao";

	// Som 8-bit de recusa (driken5482, Pixabay). Criado só no primeiro clique
	// negado: o boot já tem áudio próprio, não vale baixar mais um à toa.
	let audioNegado = null;
	function tocarNegado() {
		try {
			if (!audioNegado) {
				audioNegado = new Audio(
					"/assets/wav/driken5482-retro-hurt-1-236672.mp3"
				);
				audioNegado.volume = 0.12;
			}
			audioNegado.currentTime = 0;
			audioNegado.play().catch(() => {});
		} catch (e) {
			/* áudio é enfeite: se o navegador barrar, a balançada já dá o recado */
		}
	}

	function negar(elemento) {
		tocarNegado();
		// Tira, força reflow e repõe a classe pra animação reiniciar em cliques
		// seguidos — sem o reflow no meio o navegador não vê mudança nenhuma.
		elemento.classList.remove("boot-negado");
		void elemento.offsetWidth;
		elemento.classList.add("boot-negado");
		elemento.addEventListener(
			"animationend",
			() => elemento.classList.remove("boot-negado"),
			{ once: true }
		);
	}

	function faseDoTerminal() {
		return document.body.classList.contains("boot-active");
	}

	// Mesma largura da pele de celular no boot-terminal.css. Consultado a cada
	// clique, e não uma vez só, porque girar o aparelho muda a resposta.
	function ehCelular() {
		return window.matchMedia("(max-width: 600px)").matches;
	}

	// Escutando desde já, não só quando a sequência começa: o captcha também é
	// boot, e é de lá que dava pra escapar clicando no rádio. O listener sai
	// no fim da bootSequence.
	document.addEventListener("click", onCliqueAtalho, true);

	// Captura pra chegar antes de qualquer handler do próprio elemento. O que
	// ela NÃO faz é segurar o painel de configurações fechado: ele abre no
	// mouseenter da engrenagem (e no celular um toque dispara hover emulado),
	// então quem o mantém fechado durante o boot é uma regra do
	// boot-terminal.css, não este listener.
	function onCliqueAtalho(e) {
		const alvo = e.target.closest && e.target.closest(ATALHOS);
		if (!alvo) return;
		// O rádio é sempre recusado enquanto o boot existe, em qualquer largura e
		// nas duas telas: é por ele que dava pra escapar indo direto pra /radio/.
		//
		// A engrenagem só é recusada no celular e só na fase do terminal, que é
		// onde ela aparece apagada com o X. Em tablet/desktop, e na tela do
		// captcha, ela continua abrindo o painel normalmente — dá pra trocar o
		// tema antes de entrar.
		const ehRadio = alvo.id === "radio-botao";
		if (!ehRadio && !(faseDoTerminal() && ehCelular())) return;
		e.preventDefault();
		e.stopPropagation();
		// Quem balança é a caixinha de 40px, não o contêiner do painel.
		negar(alvo.querySelector("#settings-gear") || alvo);
	}

	const humanVerify = document.getElementById("human-verify");
	const verifyCheckbox = document.getElementById("verify-checkbox");
	const verifyCheck = document.querySelector(".verify-check");

	const bootMessages = [
		{ text: "Initializing dharlan.world terminal...", delay: 1100 },
		{ text: "Running memory check...", delay: 1200 },
		{ text: "Memory OK: 640K Base, 64M Extended", delay: 1000 },
		{ text: "CPU: dharlan.world Terminal v1.0 @ 4.77 MHz", delay: 350 },
		{ text: "dharlan.world Terminal Ready.", delay: 350 },
	];

	function wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function addLine(text) {
		const line = document.createElement("div");
		line.className = "output-line";
		line.textContent = text || "";
		output.appendChild(line);
		rolarPraBaixo();
		return line;
	}

	function addCursor(target) {
		const cursor = document.createElement("span");
		cursor.className = "cursor";
		cursor.textContent = "▋";
		target.appendChild(cursor);
		return cursor;
	}

	async function typeChars(el, text, speed) {
		for (const char of text) {
			el.textContent += char;
			rolarPraBaixo();
			await wait(speed);
		}
	}

	const typingAudio = new Audio("/assets/wav/keyboard-typing.mp3");
	const keyPressAudio = new Audio("/assets/wav/key-press.mp3");
	keyPressAudio.volume = 0.2;
	const pcBootAudio = new Audio("/assets/wav/pc-boot.mp3");
	pcBootAudio.volume = 0.1;

	// O volume do elemento vai até 1, então pra deixar a digitação mais alta
	// de fato (além do teto normal) passamos o áudio por um GainNode do Web
	// Audio API, que permite ganho acima de 1. O fade em fadeOutAndStop
	// continua funcionando normalmente, já que ele mexe no .volume do
	// elemento, que é aplicado antes do sinal entrar nesse grafo.
	let typingGainNode = null;
	let audioCtx = null;
	function getTypingGainNode() {
		if (typingGainNode) return typingGainNode;
		try {
			audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const source = audioCtx.createMediaElementSource(typingAudio);
			typingGainNode = audioCtx.createGain();
			typingGainNode.gain.value = 1.5;
			source.connect(typingGainNode).connect(audioCtx.destination);
		} catch (e) {
			typingGainNode = null;
		}
		return typingGainNode;
	}

	async function fadeOutAndStop(audio, duration = 100) {
		const steps = 12;
		const stepTime = duration / steps;
		const startVolume = audio.volume;

		for (let i = 1; i <= steps; i++) {
			audio.volume = Math.max(0, startVolume * (1 - i / steps));
			await wait(stepTime);
		}

		audio.pause();
		audio.currentTime = 0;
		audio.volume = startVolume;
	}

	function waitForEnter() {
		return new Promise((resolve) => {
			function onKeydown(e) {
				if (e.key !== "Enter") return;
				document.removeEventListener("keydown", onKeydown);
				keyPressAudio.currentTime = 0;
				keyPressAudio.play().catch(() => {});
				resolve();
			}
			document.addEventListener("keydown", onKeydown);
		});
	}

	async function runCommand() {
		const commandLine = addLine("");
		const prompt = document.createElement("span");
		prompt.className = "prompt";
		prompt.textContent = "> ";
		commandLine.appendChild(prompt);

		const commandText = document.createElement("span");
		commandLine.appendChild(commandText);
		const cursor = addCursor(commandLine);

		typingAudio.currentTime = 0;
		typingAudio.volume = 0.3;
		getTypingGainNode();
		if (audioCtx && audioCtx.state === "suspended") {
			audioCtx.resume().catch(() => {});
		}
		typingAudio.play().catch(() => {
			/* autoplay pode ser bloqueado antes de qualquer interação — tudo bem */
		});

		await typeChars(commandText, "sudo apt install dharlan.world", 75);
		cursor.remove();

		await fadeOutAndStop(typingAudio);
		await wait(900);
	}

	async function runProgressBar() {
		const barLine = addLine("");
		const steps = 30;

		for (let i = 0; i <= steps; i++) {
			const filled = "#".repeat(i);
			const empty = " ".repeat(steps - i);
			const pct = Math.round((i / steps) * 100);
			barLine.textContent = `[${filled}${empty}] ${pct}%`;
			rolarPraBaixo();
			await wait(70);
		}
	}

	async function bootSequence() {
		// Sem teclado físico à mão não faz sentido pedir Enter, então celular E
		// tablet saem sozinhos no "Done!". Este 1024px NÃO é o breakpoint da pele
		// de celular, que é 600px lá no boot-terminal.css — os dois números são
		// diferentes de propósito: o tablet fica com o desenho antigo, mas sem
		// Enter. Mudar um não implica mudar o outro.
		const isMobile = window.matchMedia("(max-width: 1024px)").matches;

		document.body.classList.add("boot-active");

		pcBootAudio.currentTime = 0;
		pcBootAudio.play().catch(() => {});
		pcBootAudio.currentTime = 0;
        pcBootAudio.play().catch(() => {});
        wait(13000).then(() => fadeOutAndStop(pcBootAudio, 2000)); // corta aos 8s, com fade de 600ms


		for (const message of bootMessages) {
			addLine(message.text);
			await wait(message.delay);
		}

		await wait(600);
		await runCommand();
		await runProgressBar();
		await wait(700);
		addLine("Done!");

		if (isMobile) {
			await wait(1200);
		} else {
			await wait(1200);
			const continueLine = addLine("Press enter to enter...");
			addCursor(continueLine);
			await waitForEnter();
		}

		sessionStorage.setItem("bootTerminalSeen", "1");

		bootTerminal.classList.add("boot-terminal-hide");
		await wait(700);
		bootTerminal.remove();
		document.body.classList.remove("boot-active");
		document.removeEventListener("click", onCliqueAtalho, true);
	}

	// aoMarcar roda dentro do próprio evento do checkbox, ou seja, ainda no
	// gesto do usuário — é onde o celular destrava os áudios (ver
	// destravarAudios).
	function runVerification(aoMarcar) {
		return new Promise((resolve) => {
			function onChange() {
				verifyCheckbox.removeEventListener("change", onChange);
				if (aoMarcar) aoMarcar();
				verifyCheck.classList.add("is-checking");

				wait(900 + Math.random() * 400)
					.then(() => {
						verifyCheck.classList.remove("is-checking");
						verifyCheck.classList.add("is-checked");
						return wait(500);
					})
					.then(() => {
						humanVerify.classList.add("human-verify-hide");
						return wait(500);
					})
					.then(() => {
						humanVerify.remove();
						resolve();
					});
			}
			verifyCheckbox.addEventListener("change", onChange);
		});
	}

	// Nome que o popup do celular mostra. O data-plataforma do <html> (script
	// no <head> da index) já desfez o caso difícil, o iPad que se diz Mac;
	// aqui só se dá nome. O resto é por userAgent mesmo — é enfeite, errar
	// num aparelho exótico não quebra nada.
	function nomeDoSistema() {
		const ua = navigator.userAgent;
		if (document.documentElement.getAttribute("data-plataforma") === "ios") {
			return /iPad|Macintosh/.test(ua) ? "iPadOS" : "iOS";
		}
		if (/Android/i.test(ua)) return "Android";
		if (/Windows/i.test(ua)) return "Windows";
		if (/Macintosh/i.test(ua)) return "macOS";
		if (/Linux|X11/i.test(ua)) return "Linux";
		return "unknown";
	}

	// No celular o terminal começa sozinho, uns 4s depois do toque no checkbox
	// (círculo + popup), e o Safari/iOS só deixa um <audio> tocar se ele já
	// tiver dado play dentro de um gesto. Então, ainda no toque, cada áudio do
	// boot dá um play mudo e para na hora: fica destravado pro play de
	// verdade lá na frente. O AudioContext da digitação nasce e é retomado
	// aqui pelo mesmo motivo.
	function destravarAudios() {
		for (const audio of [pcBootAudio, typingAudio, keyPressAudio]) {
			try {
				audio.muted = true;
				const voltar = () => {
					audio.pause();
					audio.currentTime = 0;
					audio.muted = false;
				};
				const promessa = audio.play();
				if (promessa) promessa.then(voltar, () => (audio.muted = false));
				else voltar();
			} catch (e) {
				audio.muted = false;
			}
		}
		getTypingGainNode();
		if (audioCtx && audioCtx.state === "suspended") {
			audioCtx.resume().catch(() => {});
		}
	}

	// iOS ganha a maçã, o resto o robô — o data-plataforma vem do script no
	// <head> da index. Resolve null se a imagem não vier: o popup sai sem
	// logo, mas sai.
	function carregarLogo() {
		const ios =
			document.documentElement.getAttribute("data-plataforma") === "ios";
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = ios ? "/assets/img/ioslogo.png" : "/assets/img/androidlogo.png";
		});
	}

	const BAYER_8X8 = [
		[0, 32, 8, 40, 2, 34, 10, 42],
		[48, 16, 56, 24, 50, 18, 58, 26],
		[12, 44, 4, 36, 14, 46, 6, 38],
		[60, 28, 52, 20, 62, 30, 54, 22],
		[3, 35, 11, 43, 1, 33, 9, 41],
		[51, 19, 59, 27, 49, 17, 57, 25],
		[15, 47, 7, 39, 13, 45, 5, 37],
		[63, 31, 55, 23, 61, 29, 53, 21],
	];

	// Desenha o logo em dither Bayer 8x8 e o faz "materializar": a cada passo
	// o limiar sobe e mais pontos da matriz acendem, até a imagem inteira.
	// O PNG é branco sobre transparente, então quem diz onde há logo é o
	// alfa; por cima vai um degradê de cima pra baixo, pra o dither ter o que
	// pontilhar (sem ele, branco chapado viraria bloco sólido).
	//
	// A cor sai do `color` do canvas no CSS (variável do tema) e entra com
	// source-in: o navegador resolve a cor, seja qual for a sintaxe dela, e
	// o JS não precisa saber nada de lch().
	async function desenharLogo(canvas, img) {
		const N = 64;
		canvas.width = N;
		canvas.height = N;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Os PNGs têm margens transparentes diferentes (o robô sobra num
		// quadro bem maior que ele, a maçã quase o enche), então desenhados
		// inteiros o robô saía pequeno do lado da maçã. Recorta-se a caixa do
		// que não é transparente e ela é encaixada sempre na mesma fração do
		// canvas: os dois logos ficam do mesmo tamanho, seja qual for o PNG.
		const W = img.naturalWidth;
		const H = img.naturalHeight;
		const medidor = document.createElement("canvas");
		medidor.width = W;
		medidor.height = H;
		const mctx = medidor.getContext("2d", { willReadFrequently: true });
		mctx.drawImage(img, 0, 0);
		const original = mctx.getImageData(0, 0, W, H).data;
		let x0 = W, y0 = H, x1 = -1, y1 = -1;
		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				if (original[(y * W + x) * 4 + 3] > 20) {
					if (x < x0) x0 = x;
					if (x > x1) x1 = x;
					if (y < y0) y0 = y;
					if (y > y1) y1 = y;
				}
			}
		}
		if (x1 < 0) return; // PNG todo transparente: nada a desenhar
		const cw = x1 - x0 + 1;
		const ch = y1 - y0 + 1;
		const OCUPA = 0.86; // fração do canvas que o lado maior do logo ocupa
		const escala = (N * OCUPA) / Math.max(cw, ch);
		const dw = cw * escala;
		const dh = ch * escala;

		const rascunho = document.createElement("canvas");
		rascunho.width = N;
		rascunho.height = N;
		const rctx = rascunho.getContext("2d", { willReadFrequently: true });
		rctx.drawImage(img, x0, y0, cw, ch, (N - dw) / 2, (N - dh) / 2, dw, dh);
		const alfa = rctx.getImageData(0, 0, N, N).data;

		const brilho = new Float32Array(N * N);
		for (let y = 0; y < N; y++) {
			for (let x = 0; x < N; x++) {
				brilho[y * N + x] =
					(alfa[(y * N + x) * 4 + 3] / 255) * (1 - 0.55 * (y / N));
			}
		}

		const cor = getComputedStyle(canvas).color;

		function quadro(progresso) {
			const dados = ctx.createImageData(N, N);
			for (let y = 0; y < N; y++) {
				for (let x = 0; x < N; x++) {
					if (brilho[y * N + x] * progresso * 64 > BAYER_8X8[y % 8][x % 8]) {
						const i = (y * N + x) * 4;
						dados.data[i] = dados.data[i + 1] = dados.data[i + 2] = 255;
						dados.data[i + 3] = 255;
					}
				}
			}
			ctx.globalCompositeOperation = "source-over";
			ctx.clearRect(0, 0, N, N);
			ctx.putImageData(dados, 0, 0);
			ctx.globalCompositeOperation = "source-in";
			ctx.fillStyle = cor;
			ctx.fillRect(0, 0, N, N);
			ctx.globalCompositeOperation = "source-over";
		}

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			quadro(1);
			return;
		}
		// setTimeout e não rAF: o iOS congela o rAF com a aba em segundo plano,
		// e o boot não pode ficar parado esperando a volta.
		const PASSOS = 12;
		for (let i = 1; i <= PASSOS; i++) {
			quadro(i / PASSOS);
			await wait(45);
		}
	}

	// Só no celular, entre o captcha e o terminal: círculo girando no meio da
	// tela, depois o popup com o logo e o nome do sistema, que fica uns 2,5s
	// e passa sozinho pro terminal. O som do boot continua funcionando no
	// iOS porque os áudios foram destravados no toque do checkbox.
	async function preBootCelular(logo) {
		const pre = document.getElementById("boot-pre");
		if (!pre) return;
		const canvas = document.getElementById("boot-pre-logo");
		const nomeEl = document.getElementById("boot-pre-os");
		const nome = nomeDoSistema();

		// O boot-pre-ativo já veio do start(), escondido atrás do captcha.
		pre.classList.add("boot-pre-ativo");
		await wait(1600);

		const abriu = Date.now();
		pre.classList.add("boot-pre-com-popup");
		await wait(240); // a janela abrindo, ver boot-pre-abre no CSS

		const img = logo ? await logo : null;
		if (img && canvas) {
			try {
				await desenharLogo(canvas, img);
			} catch (e) {
				/* logo é enfeite: sem canvas, o popup segue só com o texto */
			}
		}

		nomeEl.textContent = "";
		pre.classList.add("boot-pre-texto");
		await wait(150);
		for (const letra of nome) {
			nomeEl.textContent += letra;
			await wait(70);
		}

		await wait(Math.max(0, 2500 - (Date.now() - abriu)));

		// O terminal começa por baixo enquanto o popup apaga por cima.
		pre.classList.add("boot-pre-saindo");
		setTimeout(() => pre.remove(), 600);
	}

	async function start() {
		// O clique real no checkbox conta como gesto do usuário, o que
		// libera o autoplay do áudio de digitação mais adiante.
		if (humanVerify && verifyCheckbox && verifyCheck) {
			// No celular a tela do círculo já fica montada atrás do captcha
			// (z-index entre ele e o terminal), pra o fade do captcha revelar o
			// círculo e não um pedaço do terminal.
			const celular = ehCelular();
			// O logo começa a baixar já, pra estar pronto quando o popup abrir.
			let logo = null;
			if (celular) {
				document.getElementById("boot-pre")?.classList.add("boot-pre-ativo");
				logo = carregarLogo();
			}
			// definirRayId/ativarBorderGlow vêm do verify-box.js, carregado
			// antes deste arquivo — a /curriculo/ usa as mesmas duas.
			window.definirRayId(document.getElementById("verify-ray-id"));
			const desligarGlow = window.ativarBorderGlow(
				humanVerify.querySelector(".verify-box")
			);
			const desligarDither = window.iniciarDitherBg
				? window.iniciarDitherBg(humanVerify)
				: null;
			await runVerification(celular ? destravarAudios : null);
			if (desligarGlow) desligarGlow();
			if (desligarDither) desligarDither();
			if (celular) await preBootCelular(logo);
		}
		await bootSequence();
	}

	start();
});
