// portfolio.js — duas coisas na /portfolio/ pedem JS:
//
// 1. Os vídeos dos projetos. São gravações de 30 a 40 segundos, uns 2 MB
//    cada, então nascem com preload="none" e só tocam enquanto estão na tela.
//    Quem pediu menos movimento no sistema não ganha autoplay: fica o pôster
//    com os controles nativos.
// 2. Os terminais das APIs, que chamam o discordUserStatus e o proxy do
//    nikki.top de verdade quando aparecem. As duas moram no plano grátis do
//    Render, que dorme depois de um tempo parado — a primeira resposta pode
//    levar quase um minuto, ou não vir. Sem resposta, volta o exemplo que já
//    está escrito no HTML.

const DISCORD_ID = "682694935631233203";
const URL_DISCORD = `https://discorduserstatus-2-0.onrender.com/status/${DISCORD_ID}`;
const URL_NIKKI =
	"https://nikki-top-custom-api-z51j.onrender.com/proxy?url=" +
	encodeURIComponent("https://nikki.top/api.php?id=376&limit=1");

// O Render acordando costuma levar de 30 a 50s. Depois disso, desiste.
const TEMPO_LIMITE = 55000;
// A partir daqui, avisa que a demora é o servidor acordando.
const AVISO_DORMINDO = 4000;
const TAMANHO_TRECHO_HTML = 360;
const TAMANHO_TEXTO_JSON = 54;

function semAnimacao() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function criar(tag, classe, texto) {
	const el = document.createElement(tag);
	if (classe) el.className = classe;
	if (texto !== undefined) el.textContent = texto;
	return el;
}

function cortar(texto, max) {
	return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

// ----------------------------------------------
// Vídeos
// ----------------------------------------------

function iniciarVideos() {
	const videos = document.querySelectorAll(".tela-video");
	if (!videos.length) return;

	if (semAnimacao() || !("IntersectionObserver" in window)) {
		videos.forEach((video) => (video.controls = true));
		return;
	}

	const tocar = (video) => {
		const promessa = video.play();
		// Safari em modo de pouca energia (e alguns Androids) recusam autoplay
		// mesmo com o vídeo mudo. Aí entram os controles nativos, pra tocar
		// com um toque.
		if (promessa) promessa.catch(() => (video.controls = true));
	};

	const observador = new IntersectionObserver(
		(entradas) => {
			for (const entrada of entradas) {
				const video = entrada.target;
				if (entrada.isIntersecting) {
					if (!video.dataset.pausadoAMao) tocar(video);
				} else if (!video.paused) {
					video.pause();
				}
			}
		},
		{ threshold: 0.35 },
	);

	videos.forEach((video) => {
		observador.observe(video);

		// Um clique pausa e outro despausa. A pausa feita à mão vale até o
		// próximo clique, mesmo rolando pra longe e voltando — senão o
		// observador religaria o vídeo de quem quis parar pra olhar.
		video.addEventListener("click", () => {
			if (video.controls) return; // os controles nativos já cuidam
			const tela = video.closest(".tela");
			if (video.paused) {
				delete video.dataset.pausadoAMao;
				tela?.classList.remove("pausado");
				tocar(video);
			} else {
				video.dataset.pausadoAMao = "1";
				tela?.classList.add("pausado");
				video.pause();
			}
		});
	});
}

// ----------------------------------------------
// Terminais das APIs
// ----------------------------------------------

// Tudo que vem de fora entra como texto (textContent), nunca como HTML: a
// resposta do nikki.top é HTML de terceiro e seria um buraco aqui dentro.
function escrever(saida, classe, texto) {
	saida.appendChild(
		classe ? criar("span", classe, texto) : document.createTextNode(texto),
	);
}

function segundos(ms) {
	return `${(ms / 1000).toFixed(1).replace(".", ",")}s`;
}

async function buscar(url, comoTexto) {
	const controle = new AbortController();
	const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE);
	try {
		const resposta = await fetch(url, {
			cache: "no-store",
			signal: controle.signal,
		});
		if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
		return {
			corpo: comoTexto ? await resposta.text() : await resposta.json(),
			status: resposta.status,
		};
	} finally {
		clearTimeout(limite);
	}
}

// JSON indentado à mão, uma chave por linha, pra poder pintar a chave e o
// status separados do resto.
function mostrarDiscord(saida, dados) {
	const campos = {
		userId: dados.userId,
		username: dados.username,
		status: dados.status,
		avatarUrl: dados.avatarUrl,
		badges: Array.isArray(dados.badges)
			? dados.badges.map((b) => b && b.id).filter(Boolean)
			: [],
		timestamp: dados.timestamp,
	};
	const chaves = Object.keys(campos).filter((c) => campos[c] !== undefined);

	escrever(saida, null, "{\n");
	chaves.forEach((chave, i) => {
		const valor = campos[chave];
		escrever(saida, null, "  ");
		escrever(saida, "t-chave", `"${chave}"`);
		escrever(saida, null, ": ");

		const texto =
			typeof valor === "string"
				? JSON.stringify(cortar(valor, TAMANHO_TEXTO_JSON))
				: JSON.stringify(valor);
		if (chave === "status") {
			const conhecido = ["online", "idle", "dnd"].includes(valor)
				? valor
				: "offline";
			escrever(saida, `t-status-${conhecido}`, texto);
		} else {
			escrever(saida, null, texto);
		}
		escrever(saida, null, i < chaves.length - 1 ? ",\n" : "\n");
	});
	escrever(saida, null, "}\n");
}

// A api.php do nikki.top devolve um pedaço de HTML. Mostra o começo dele cru
// e, embaixo, o que o site tira dali (mesma leitura do statuscafe-custom.js).
// O DOMParser não executa script nenhum, então ler o HTML assim é seguro.
function mostrarNikki(saida, html) {
	const cru = html.replace(/\s+/g, " ").trim();
	escrever(saida, "t-html", `${cortar(cru, TAMANHO_TRECHO_HTML)}\n`);

	const post = new DOMParser()
		.parseFromString(html, "text/html")
		.querySelector(".posts");
	const texto = post?.querySelector(".content")?.textContent.trim();
	const data = post?.querySelector(".date")?.textContent.trim();
	if (texto) {
		escrever(
			saida,
			"t-comentario",
			`# → na home: “${cortar(texto, 140)}”${data ? ` (${data})` : ""}\n`,
		);
	}
}

const APIS = {
	discord: { comoTexto: false, mostrar: mostrarDiscord, url: URL_DISCORD },
	nikki: { comoTexto: true, mostrar: mostrarNikki, url: URL_NIKKI },
};

function iniciarTerminal(tela) {
	const api = APIS[tela.dataset.api];
	const saida = tela.querySelector(".t-saida");
	const botao = tela.querySelector(".terminal-rodar");
	if (!api || !saida) return;

	// O exemplo do HTML é guardado como nós, não como string: volta igualzinho
	// se a API não responder.
	const exemplo = Array.from(saida.childNodes, (no) => no.cloneNode(true));
	let rodando = false;

	const rodar = async () => {
		if (rodando) return;
		rodando = true;
		if (botao) botao.disabled = true;

		saida.replaceChildren();
		const espera = criar("span", "t-comentario");
		saida.appendChild(espera);

		const inicio = performance.now();
		let pontos = 0;
		const atualizarEspera = () => {
			const decorrido = performance.now() - inicio;
			const reticencias = semAnimacao()
				? "..."
				: ".".repeat((pontos++ % 3) + 1).padEnd(3, " ");
			espera.textContent =
				`# conectando${reticencias} ${segundos(decorrido)}` +
				(decorrido > AVISO_DORMINDO
					? "\n# o servidor tava dormindo — plano grátis do Render, já já ele acorda"
					: "");
		};
		atualizarEspera();
		const relogio = setInterval(atualizarEspera, 400);

		try {
			const { corpo, status } = await buscar(api.url, api.comoTexto);
			clearInterval(relogio);
			saida.replaceChildren();
			escrever(
				saida,
				"t-comentario",
				`# ${status} OK em ${segundos(performance.now() - inicio)}\n`,
			);
			api.mostrar(saida, corpo);
		} catch (erro) {
			clearInterval(relogio);
			console.error(`Falha ao chamar a API (${tela.dataset.api}):`, erro);
			saida.replaceChildren();
			const motivo =
				erro.name === "AbortError"
					? "não acordou a tempo"
					: "não respondeu agora";
			escrever(saida, "t-erro", `# o servidor ${motivo}. fica o exemplo:\n`);
			exemplo.forEach((no) => saida.appendChild(no.cloneNode(true)));
			escrever(saida, null, "\n");
		}

		escrever(saida, "t-prompt", "dharlan@world:~$ ");
		escrever(saida, "t-cursor", "█");
		rodando = false;
		if (botao) {
			botao.hidden = false;
			botao.disabled = false;
		}
	};

	botao?.addEventListener("click", rodar);

	// Só chama a API quando o terminal aparece: quem nunca rola até aqui não
	// acorda servidor nenhum.
	if (!("IntersectionObserver" in window)) {
		rodar();
		return;
	}
	const observador = new IntersectionObserver(
		(entradas) => {
			if (!entradas.some((e) => e.isIntersecting)) return;
			observador.disconnect();
			rodar();
		},
		{ threshold: 0.4 },
	);
	observador.observe(tela);
}

document.addEventListener("DOMContentLoaded", () => {
	iniciarVideos();
	document
		.querySelectorAll(".tela-terminal[data-api]")
		.forEach(iniciarTerminal);
});
