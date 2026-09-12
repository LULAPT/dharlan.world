// radio.js — núcleo do player de rádio.
//
// Porte do webdeck-player do cristiancfm (MIT), em assets/radio-temas/. A
// marcação e o CSS dos temas são os do projeto original — o visual retrô é o
// ponto. O que mudou é a volta por cima: as estações vêm de JSON, o estado
// sobrevive à navegação e existe um modo "destacado" (ver radio-mini.js).
//
// O site é multipágina: cada clique recarrega o documento e mata o áudio. Por
// isso estação/faixa/segundo/volume moram no localStorage e são restaurados no
// load seguinte. Áudio contínuo de verdade só com SPA ou popup, e as duas
// coisas contrariam o projeto.

const CHAVE_ESTADO = "radio-estado";
const CHAVE_TEMA = "radio-tema";
// Chave nova de propósito. A antiga (radio-destacado) já tinha "false"
// gravado no navegador de quem desligou o modo enquanto ele nascia desligado —
// e esse valor continuaria segurando o botão em off agora que o padrão é on.
// Trocar o nome é o jeito mais barato de fazer o padrão valer pra todo mundo;
// a antiga é apagada logo abaixo pra não ficar lixo no localStorage.
const CHAVE_DESTACADO = "radio-flutuar";

try {
	localStorage.removeItem("radio-destacado");
} catch {}

export const CAMINHO_TEMAS = "/assets/radio-temas";
// O tema que abre pra quem nunca escolheu. Se mudar aqui, mude junto o href do
// <link id="player-theme"> no radio.html — ele aponta pro mesmo arquivo, pra
// folha certa já vir no HTML e não piscar o tema errado antes do JS rodar.
export const TEMA_PADRAO = "default";

// id = nome da pasta em assets/radio-temas/
export const TEMAS = [
	{ id: "dharlan", label: "DHARLAN", logo: false },
	{ id: "dharlan-claro", label: "DHARLAN CLARO", logo: false },
	{ id: "dharlan-steam", label: "DHARLAN STEAM", logo: false },
	{ id: "default", label: "DEFAULT", logo: true },
	{ id: "silver", label: "SILVER", logo: true },
	{ id: "violet", label: "VIOLET", logo: true },
	{ id: "minimal", label: "MINIMAL", logo: true },
	{ id: "red-grunge", label: "RED GRUNGE", logo: true },
];

const ESTADO_PADRAO = {
	estacao: null,
	indice: 0,
	tempo: 0,
	volume: 50,
	shuffle: false,
	tocando: false,
};

export function caminhoTema(id) {
	return `${CAMINHO_TEMAS}/${id}/webdeck-player.css`;
}

export function caminhoImagem(id, nome) {
	return `${CAMINHO_TEMAS}/${id}/images/${nome}.png`;
}

export function temaValido(id) {
	return TEMAS.some((t) => t.id === id) ? id : TEMA_PADRAO;
}

/* ------------------------------------ */
/*             Persistência             */
/* ------------------------------------ */

// Tudo em try/catch: Safari em aba anônima estoura no localStorage, e o rádio
// não pode derrubar a página por causa disso.

export function lerEstado() {
	try {
		const bruto = localStorage.getItem(CHAVE_ESTADO);
		if (!bruto) return { ...ESTADO_PADRAO };
		return { ...ESTADO_PADRAO, ...JSON.parse(bruto) };
	} catch {
		return { ...ESTADO_PADRAO };
	}
}

function salvarEstado(estado) {
	try {
		localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
	} catch {}
}

export function lerTema() {
	try {
		return temaValido(localStorage.getItem(CHAVE_TEMA));
	} catch {
		return TEMA_PADRAO;
	}
}

export function salvarTema(tema) {
	try {
		localStorage.setItem(CHAVE_TEMA, tema);
	} catch {}
}

// Ligado por padrão: a graça do modo flutuante é o rádio acompanhar quem sai
// da /radio/, e ninguém ia adivinhar que precisa apertar antes de navegar. Só
// fica desligado pra quem desligou de propósito — daí o !== "false" em vez do
// === "true" (mesmo critério do festiveEffects no main.js).
export function estaDestacado() {
	try {
		return localStorage.getItem(CHAVE_DESTACADO) !== "false";
	} catch {
		return true;
	}
}

export function setDestacado(valor) {
	try {
		localStorage.setItem(CHAVE_DESTACADO, valor ? "true" : "false");
	} catch {}
}

/* ------------------------------------ */
/*             API do YouTube           */
/* ------------------------------------ */

let promessaApi = null;

function carregarApiYoutube() {
	if (promessaApi) return promessaApi;

	promessaApi = new Promise((resolve, reject) => {
		if (window.YT && window.YT.Player) return resolve(window.YT);

		// A API só avisa que carregou por essa global; ela precisa existir antes
		// do <script> entrar na página e só pode ser definida uma vez.
		const anterior = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			if (typeof anterior === "function") anterior();
			resolve(window.YT);
		};

		const script = document.createElement("script");
		script.src = "https://www.youtube.com/iframe_api";
		script.onerror = () => reject(new Error("iframe_api não carregou"));
		document.head.appendChild(script);

		// Bloqueador de anúncio ou rede caída: desiste em vez de ficar pendurado.
		setTimeout(() => reject(new Error("timeout da API do YouTube")), 12000);
	});

	return promessaApi;
}

export async function carregarEstacoes() {
	const resposta = await fetch("/assets/json/radio-estacoes.json");
	if (!resposta.ok) throw new Error("radio-estacoes.json indisponível");
	return resposta.json();
}

/* ------------------------------------ */
/*              Controlador             */
/* ------------------------------------ */

/**
 * Cria o controlador ligado a um <div> que a API do YouTube vira iframe.
 * Só existe um por documento — a /radio/ e o mini player nunca aparecem juntos.
 *
 * @param {HTMLElement} elementoVideo div que a API substitui
 * @param {Array} estacoes lista vinda de radio-estacoes.json
 * @param {(dados: object) => void} aoAtualizar callback de render
 */
export function criarRadio(elementoVideo, estacoes, aoAtualizar) {
	const estado = lerEstado();
	let player = null;
	let pronto = false;
	let bloqueadoPorAutoplay = false;
	let relogio = null;
	let ticks = 0;

	if (!estado.estacao || !estacoes.some((e) => e.id === estado.estacao)) {
		estado.estacao = estacoes[0]?.id ?? null;
		estado.indice = 0;
		estado.tempo = 0;
	}

	function estacaoAtual() {
		return estacoes.find((e) => e.id === estado.estacao) ?? estacoes[0];
	}

	function chamar(metodo, padrao) {
		try {
			const v = player?.[metodo]?.();
			return v === undefined || v === null ? padrao : v;
		} catch {
			return padrao;
		}
	}

	function avisar(extra = {}) {
		if (typeof aoAtualizar !== "function") return;
		const dados = chamar("getVideoData", null);
		const lista = chamar("getPlaylist", null);
		aoAtualizar({
			estado: { ...estado },
			estacao: estacaoAtual(),
			pronto,
			bloqueadoPorAutoplay,
			titulo: dados?.title ?? "",
			autor: dados?.author ?? "",
			estadoPlayer: chamar("getPlayerState", -1),
			indice: chamar("getPlaylistIndex", estado.indice),
			total: Array.isArray(lista) ? lista.length : 0,
			tempo: chamar("getCurrentTime", estado.tempo),
			duracao: chamar("getDuration", 0),
			volume: chamar("getVolume", estado.volume),
			...extra,
		});
	}

	function sincronizarEstado() {
		const i = chamar("getPlaylistIndex", -1);
		if (i >= 0) estado.indice = i;
		estado.tempo = chamar("getCurrentTime", estado.tempo);
		salvarEstado(estado);
	}

	// O original roda a 100ms. 200ms mantém a seek bar suave e pesa menos; o
	// localStorage só é gravado a cada 2s pra não martelar o disco.
	function ligarRelogio() {
		if (relogio) return;
		relogio = setInterval(() => {
			if (++ticks % 10 === 0) sincronizarEstado();
			avisar();
		}, 200);
	}

	function desligarRelogio() {
		clearInterval(relogio);
		relogio = null;
	}

	function aoMudarEstado(evento) {
		const YT = window.YT;

		if (evento.data === YT.PlayerState.PLAYING) {
			estado.tocando = true;
			bloqueadoPorAutoplay = false;
			ligarRelogio();
		} else if (evento.data === YT.PlayerState.PAUSED) {
			estado.tocando = false;
		} else if (evento.data === YT.PlayerState.ENDED) {
			// Igual ao original: fim da faixa puxa a próxima.
			try {
				player.nextVideo();
			} catch {}
		}

		sincronizarEstado();
		avisar();
	}

	async function iniciar() {
		let YT;
		try {
			YT = await carregarApiYoutube();
		} catch (erro) {
			console.error("Rádio: API do YouTube falhou —", erro.message);
			avisar({ erro: erro.message });
			return;
		}

		player = new YT.Player(elementoVideo, {
			height: "100%",
			width: "100%",
			playerVars: {
				autoplay: 0,
				controls: 0,
				loop: 1,
				playsinline: 1,
				// Quem comanda são os botões daqui. controls esconde a barra do
				// YouTube, disablekb tira o atalho de teclado dele (senão espaço e
				// setas dariam play/pause por fora do nosso estado) e
				// iv_load_policy some com as anotações sobre o vídeo. O clique na
				// tela quem bloqueia é o pointer-events do radio.css.
				disablekb: 1,
				iv_load_policy: 3,
				// O player precisa nascer sabendo o que tocar. Sem videoId E sem
				// list/listType aqui, a API monta o iframe como ".../embed/?..." —
				// um embed sem nada dentro — e o YouTube responde erro 2 antes de
				// qualquer cuePlaylist rodar. A documentação diz que um dos dois
				// resolve: "If you specify values for the list and listType
				// parameters, the IFrame embed URL does not need to specify a
				// video ID."
				listType: "playlist",
				list: estacaoAtual().playlist,
			},
			events: {
				onReady: () => {
					pronto = true;
					player.setVolume(estado.volume);
					player.setLoop(true);
					if (estado.shuffle) player.setShuffle(true);

					// A playlist já nasceu cueada pelos playerVars; isto aqui recarrega
					// pra aplicar a faixa e o segundo que vieram da página anterior.
					//
					// O listType vai junto porque a documentação só o chama de
					// "opcional" já que o `list` também aceita um array de IDs de
					// vídeo — quando é ID de playlist, ele é necessário.
					const opcoes = {
						listType: "playlist",
						list: estacaoAtual().playlist,
						index: estado.indice,
						startSeconds: estado.tempo,
					};

					// Se estava tocando na página anterior, tenta continuar. O
					// navegador pode barrar (som sem gesto do usuário), e a permissão
					// não atravessa o page load — daí o bloqueadoPorAutoplay.
					if (estado.tocando) {
						player.loadPlaylist(opcoes);
						setTimeout(() => {
							if (chamar("getPlayerState", -1) !== YT.PlayerState.PLAYING) {
								bloqueadoPorAutoplay = true;
								estado.tocando = false;
								salvarEstado(estado);
								avisar();
							}
						}, 2500);
					} else {
						player.cuePlaylist(opcoes);
					}

					ligarRelogio();
					avisar();
				},
				onStateChange: aoMudarEstado,
				onError: (e) => {
					console.error("Rádio: erro do player do YouTube —", e.data);
					avisar({ erro: `código ${e.data}` });
				},
			},
		});
	}

	iniciar();

	/* --------- controles públicos --------- */

	return {
		get estado() {
			return { ...estado };
		},
		estacaoAtual,

		tocarPausar() {
			if (!pronto) return;
			bloqueadoPorAutoplay = false;
			const YT = window.YT;
			if (chamar("getPlayerState", -1) === YT.PlayerState.PLAYING) {
				try {
					player.pauseVideo();
				} catch {}
			} else {
				try {
					player.playVideo();
				} catch {}
			}
		},

		parar() {
			if (!pronto) return;
			try {
				player.stopVideo();
			} catch {}
			estado.tocando = false;
			estado.tempo = 0;
			salvarEstado(estado);
			avisar();
		},

		proxima() {
			if (!pronto) return;
			estado.tempo = 0;
			try {
				player.nextVideo();
			} catch {}
		},

		anterior() {
			if (!pronto) return;
			estado.tempo = 0;
			try {
				player.previousVideo();
			} catch {}
		},

		setVolume(valor) {
			estado.volume = Math.max(0, Math.min(100, Math.round(valor)));
			try {
				player?.setVolume(estado.volume);
			} catch {}
			salvarEstado(estado);
		},

		alternarShuffle() {
			estado.shuffle = !estado.shuffle;
			try {
				player?.setShuffle(estado.shuffle);
			} catch {}
			salvarEstado(estado);
			avisar();
			return estado.shuffle;
		},

		buscar(segundos) {
			if (!pronto) return;
			try {
				player.seekTo(Number(segundos), true);
			} catch {}
			estado.tempo = Number(segundos);
		},

		trocarEstacao(id) {
			const nova = estacoes.find((e) => e.id === id);
			if (!nova) return;
			estado.estacao = id;
			estado.indice = 0;
			estado.tempo = 0;
			salvarEstado(estado);
			if (!pronto) return;
			try {
				player.stopVideo();
				// Mesmo listType do onReady: sem ele a troca de estação daria
				// erro 2 e o deck ficaria mudo.
				const opcoes = { listType: "playlist", list: nova.playlist };
				if (estado.tocando) player.loadPlaylist(opcoes);
				else player.cuePlaylist(opcoes);
			} catch {}
			avisar();
		},

		destruir() {
			desligarRelogio();
			sincronizarEstado();
			try {
				player?.destroy();
			} catch {}
		},
	};
}

/* ------------------------------------ */
/*               Utilitários            */
/* ------------------------------------ */

// Mesmo formato do original (m:ss).
export function formatarTempo(entrada) {
	const total = Number(entrada);
	if (!total || !isFinite(total) || total < 0) return "0:00";
	const minutos = Math.trunc(total / 60);
	const segundos = Math.trunc(total - minutos * 60);
	return `${minutos}:${String(segundos).padStart(2, "0")}`;
}

export function rotuloDoEstado(estadoPlayer) {
	switch (estadoPlayer) {
		case -1:
			return "Stopped";
		case 0:
			return "Ended";
		case 1:
			return "Playing";
		case 2:
			return "Paused";
		case 3:
			return "Loading... ";
		case 5:
			return "Video Cued";
		default:
			return "";
	}
}
