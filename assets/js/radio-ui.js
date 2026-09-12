// radio-ui.js — monta a marcação do webdeck-player e liga nos controles.
//
// A marcação (ids #player-body, #info-screen, #seekBar, .playing-controls...) é
// a mesma do projeto original de propósito: é ela que os CSS de tema em
// assets/radio-temas/ esperam encontrar. Mexer nos ids quebra os 8 temas de uma
// vez. O mini player usa exatamente esta marcação também — o que muda é só o
// CSS em radio.css, por isso os dois ficam idênticos em qualquer tema.

import {
	TEMAS,
	caminhoImagem,
	caminhoTema,
	criarRadio,
	estaDestacado,
	formatarTempo,
	lerTema,
	rotuloDoEstado,
	salvarTema,
	setDestacado,
} from "/assets/js/radio.js";

const ID_LINK_TEMA = "player-theme";

export function garantirLinkTema(tema) {
	let link = document.getElementById(ID_LINK_TEMA);
	if (!link) {
		link = document.createElement("link");
		link.id = ID_LINK_TEMA;
		link.rel = "stylesheet";
		document.head.appendChild(link);
	}
	link.href = caminhoTema(tema);
	return link;
}

function marcacao(titulo) {
	return `
		<div id="player-title-bar">${titulo}</div>

		<div id="player-body">
			<div id="player-main-section">
				<div class="columns">
					<div id="player-display">
						<div id="youtube-player"></div>
					</div>

					<div id="player-info">
						<div id="info-screen">
							<p id="songLabel"><b>Carregando...</b></p>
							<div id="statusLabel"><br /></div>
						</div>

						<div class="player-row">
							<div id="player-volume">
								<button id="volumeButton" title="Mudo"></button>
								<input type="range" id="volumeBar" title="Volume" min="0" max="100" value="50" />
							</div>

							<select id="themeSelector" title="Tema do rádio"></select>
						</div>

						<div class="player-row">
							<button id="videoButton" class="toggle-button" state="on" title="Mostrar/esconder vídeo"><p>Video</p></button>
							<div id="playerLogo"></div>
						</div>
					</div>
				</div>
			</div>

			<div id="player-control-panel">
				<input type="range" id="seekBar" title="Pular pra outro ponto" value="0" />
				<br />

				<div class="playing-controls">
					<button id="prevButton" title="Faixa anterior"></button>
					<button id="playButton" title="Tocar / pausar"></button>
					<button id="stopButton" title="Parar"></button>
					<button id="nextButton" title="Próxima faixa"></button>
				</div>

				<div class="playing-controls">
					<button id="shuffleButton" class="toggle-button" state="off" title="Aleatório"><p>Shuffle</p></button>
				</div>

				<div class="playing-controls">
					<button id="detachButton" class="toggle-button" state="off" title="Deixar o rádio flutuando no canto ao navegar pelo site"><p>Flutuar</p></button>
				</div>

				<div class="playing-controls" float-right>
					<select id="playlistSelector" title="Estação"></select>
				</div>

				<div class="playing-controls" rounded float-right>
					<button id="infoButton" title="Sobre"></button>
				</div>
			</div>
		</div>
	`;
}

/**
 * Monta o player dentro de `alvo` e devolve o controlador.
 *
 * @param {HTMLElement} alvo elemento que vira o #web-deck-player
 * @param {Array} estacoes lista vinda de radio-estacoes.json
 * @param {object} opcoes { titulo, mini }
 */
export function montarPlayer(alvo, estacoes, opcoes = {}) {
	const { titulo = "RADIO", mini = false } = opcoes;

	let tema = lerTema();
	garantirLinkTema(tema);

	alvo.id = "web-deck-player";
	if (mini) alvo.classList.add("radio-mini");
	alvo.innerHTML = marcacao(titulo);

	const $ = (id) => alvo.querySelector(`#${id}`);

	const songLabel = $("songLabel");
	const statusLabel = $("statusLabel");
	const volumeButton = $("volumeButton");
	const volumeBar = $("volumeBar");
	const themeSelector = $("themeSelector");
	const videoButton = $("videoButton");
	const playerLogo = $("playerLogo");
	const seekBar = $("seekBar");
	const prevButton = $("prevButton");
	const playButton = $("playButton");
	const stopButton = $("stopButton");
	const nextButton = $("nextButton");
	const shuffleButton = $("shuffleButton");
	const detachButton = $("detachButton");
	const infoButton = $("infoButton");
	const playlistSelector = $("playlistSelector");

	let volumeSalvo = 50;
	let arrastandoSeek = false;
	let arrastandoVolume = false;
	let videoVisivel = true;
	let tituloAnterior = null;

	/* --------- ícones dependem do tema --------- */

	function pintarIcones() {
		const icone = (nome) =>
			`<img src="${caminhoImagem(tema, nome)}" alt="" />`;
		volumeButton.innerHTML = icone(volumeBar.value == 0 ? "mute" : "sound");
		prevButton.innerHTML = icone("prev");
		stopButton.innerHTML = icone("stop");
		nextButton.innerHTML = icone("next");
		infoButton.innerHTML = icone("info");
		playButton.innerHTML = icone(
			playButton.dataset.estado === "tocando" ? "pause" : "play"
		);

		// Os temas do dharlan desenham o logo em texto pelo CSS (::after), então
		// não têm logo.png pra injetar.
		const meta = TEMAS.find((t) => t.id === tema);
		playerLogo.innerHTML = meta?.logo
			? `<img src="/assets/radio-temas/${tema}/logo.png" alt="" />`
			: "";
	}

	/* --------- seletores --------- */

	playlistSelector.innerHTML = estacoes
		.map((e) => `<option value="${e.id}">${e.nome}</option>`)
		.join("");
	themeSelector.innerHTML = TEMAS.map(
		(t) => `<option value="${t.id}">${t.label}</option>`
	).join("");
	themeSelector.value = tema;

	playButton.dataset.estado = "parado";
	pintarIcones();

	/* --------- controlador --------- */

	const radio = criarRadio($("youtube-player"), estacoes, render);

	function render(dados) {
		const {
			estado,
			estacao,
			titulo: nomeFaixa,
			autor,
			estadoPlayer,
			indice,
			total,
			tempo,
			duracao,
			volume,
			bloqueadoPorAutoplay,
			erro,
		} = dados;

		// songLabel: <marquee> mesmo, igual ao original — combina com o site.
		let textoFaixa;
		if (erro) textoFaixa = "<b>ERRO — o youtube não respondeu</b>";
		else if (!nomeFaixa) textoFaixa = "<b>PRONTO</b>";
		else
			textoFaixa = `<marquee><b>${nomeFaixa}${autor ? ` - ${autor}` : ""}</b></marquee>`;

		if (textoFaixa !== tituloAnterior) {
			songLabel.innerHTML = textoFaixa;
			tituloAnterior = textoFaixa;
		}

		if (bloqueadoPorAutoplay) {
			statusLabel.innerHTML = "Clique no play pra continuar";
			statusLabel.setAttribute("class", "blink");
		} else if (erro) {
			statusLabel.innerHTML = "Sem conexão com o YouTube";
			statusLabel.removeAttribute("class");
		} else {
			const lista = total ? ` ${indice + 1}/${total}` : "";
			statusLabel.innerHTML = `${rotuloDoEstado(estadoPlayer)}${lista} ${formatarTempo(tempo)}/${formatarTempo(duracao)}`;
			// Igual ao original: pausado pisca.
			if (estadoPlayer === 2) statusLabel.setAttribute("class", "blink");
			else statusLabel.removeAttribute("class");
		}

		if (duracao) seekBar.setAttribute("max", duracao);
		if (!arrastandoSeek) seekBar.value = tempo;
		if (!arrastandoVolume && document.activeElement !== volumeBar) {
			volumeBar.value = volume;
		}

		const tocando = estadoPlayer === 1;
		const estadoBotao = tocando ? "tocando" : "parado";
		if (playButton.dataset.estado !== estadoBotao) {
			playButton.dataset.estado = estadoBotao;
			playButton.innerHTML = `<img src="${caminhoImagem(tema, tocando ? "pause" : "play")}" alt="" />`;
		}
		playButton.classList.toggle("pedindo-clique", !!bloqueadoPorAutoplay);

		shuffleButton.setAttribute("state", estado.shuffle ? "on" : "off");
		if (playlistSelector.value !== estado.estacao) {
			playlistSelector.value = estado.estacao;
		}
		if (estacao) playlistSelector.title = estacao.descricao ?? "Estação";
	}

	/* --------- eventos --------- */

	playButton.addEventListener("click", () => radio.tocarPausar());
	stopButton.addEventListener("click", () => radio.parar());
	nextButton.addEventListener("click", () => radio.proxima());
	prevButton.addEventListener("click", () => radio.anterior());
	shuffleButton.addEventListener("click", () => radio.alternarShuffle());

	volumeButton.addEventListener("click", () => {
		if (volumeBar.value != 0) {
			volumeSalvo = volumeBar.value;
			radio.setVolume(0);
			volumeBar.value = 0;
		} else {
			radio.setVolume(volumeSalvo);
			volumeBar.value = volumeSalvo;
		}
		volumeButton.innerHTML = `<img src="${caminhoImagem(tema, volumeBar.value == 0 ? "mute" : "sound")}" alt="" />`;
	});

	volumeBar.addEventListener("input", function () {
		arrastandoVolume = true;
		radio.setVolume(this.value);
		volumeButton.innerHTML = `<img src="${caminhoImagem(tema, this.value == 0 ? "mute" : "sound")}" alt="" />`;
	});
	volumeBar.addEventListener("change", () => (arrastandoVolume = false));

	seekBar.addEventListener("input", function () {
		arrastandoSeek = true;
		radio.buscar(this.value);
	});
	seekBar.addEventListener("change", () => (arrastandoSeek = false));

	videoButton.addEventListener("click", () => {
		videoVisivel = !videoVisivel;
		// O original usa `hidden` (display:none). Aqui é visibility, porque
		// display:none em iframe já derrubou áudio em navegador antes — o
		// resultado visual é o mesmo (tela preta).
		alvo
			.querySelector("#player-display")
			.classList.toggle("video-escondido", !videoVisivel);
		videoButton.setAttribute("state", videoVisivel ? "on" : "off");
	});

	playlistSelector.addEventListener("change", () =>
		radio.trocarEstacao(playlistSelector.value)
	);

	themeSelector.addEventListener("change", () => {
		tema = themeSelector.value;
		salvarTema(tema);
		garantirLinkTema(tema);
		pintarIcones();
	});

	function pintarBotaoFlutuar() {
		detachButton.setAttribute("state", estaDestacado() ? "on" : "off");
	}
	detachButton.addEventListener("click", () => {
		setDestacado(!estaDestacado());
		pintarBotaoFlutuar();
	});
	pintarBotaoFlutuar();

	infoButton.addEventListener("click", () => {
		alert(
			"Webdeck Player — criado por Chris\n" +
				"github.com/cristiancfm/webdeck-player\n" +
				"(c) MIT License\n\n" +
				"Adaptado pro dharlan.world."
		);
	});

	// Grava a posição antes de sair, pra próxima página continuar de onde parou.
	window.addEventListener("pagehide", () => radio.destruir());

	return { radio, alvo, pintarIcones };
}
