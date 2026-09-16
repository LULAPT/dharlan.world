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

	function runVerification() {
		return new Promise((resolve) => {
			function onChange() {
				verifyCheckbox.removeEventListener("change", onChange);
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

	async function start() {
		// O clique real no checkbox conta como gesto do usuário, o que
		// libera o autoplay do áudio de digitação mais adiante.
		if (humanVerify && verifyCheckbox && verifyCheck) {
			// definirRayId/ativarBorderGlow vêm do verify-box.js, carregado
			// antes deste arquivo — a /curriculo/ usa as mesmas duas.
			window.definirRayId(document.getElementById("verify-ray-id"));
			const desligarGlow = window.ativarBorderGlow(
				humanVerify.querySelector(".verify-box")
			);
			const desligarDither = window.iniciarDitherBg
				? window.iniciarDitherBg(humanVerify)
				: null;
			await runVerification();
			if (desligarGlow) desligarGlow();
			if (desligarDither) desligarDither();
		}
		await bootSequence();
	}

	start();
});
