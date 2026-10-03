// yt-dlp.js — monta o comando do yt-dlp a partir do formulário da /yt-dlp/.
//
// A página não baixa nada: só escreve o comando. Ver o comentário no topo do
// yt-dlp.html pro porquê.
//
// Tudo vai entre aspas duplas, e não simples, porque é o único jeito de aspa
// que funciona igual no cmd, no PowerShell, no bash e no fish — que é onde
// esse comando vai ser colado (Windows e CachyOS). Aspa simples no cmd não é
// aspa nenhuma.

const form = document.getElementById("ytd-form");
const codigo = document.getElementById("ytd-codigo");
const botaoCopiar = document.getElementById("ytd-copiar");
const avisoUrl = document.getElementById("ytd-aviso-url");
const avisoTempo = document.getElementById("ytd-aviso-tempo");

// "1:30", "01:02:03", "90", "1:30.5". O yt-dlp aceita isso no
// --download-sections; o resto ele recusa com um erro pouco claro, então o
// aviso aparece aqui antes.
const TEMPO = /^\d+(:\d{1,2}){0,2}(\.\d+)?$/;

// Os três caracteres que, dentro de aspas duplas, ainda fazem alguma coisa em
// algum desses shells: a própria aspa fecha a string, e $ e ` expandem no
// PowerShell, no bash e no fish. Num link eles só aparecem por acidente, e
// codificados continuam sendo o mesmo endereço pro servidor.
function limparUrl(bruto) {
	return bruto
		.trim()
		.replace(/"/g, "%22")
		.replace(/\$/g, "%24")
		.replace(/`/g, "%60");
}

// O campo de idiomas é texto livre e vai parar dentro de aspas no comando.
// Só passa o que uma lista de idiomas do yt-dlp usa de verdade.
function limparIdiomas(bruto) {
	return bruto.replace(/[^\w.*,\-]/g, "") || "pt.*,en.*";
}

function aspas(texto) {
	return `"${texto}"`;
}

function ler() {
	const d = new FormData(form);
	return {
		url: limparUrl(d.get("url") || ""),
		modo: d.get("modo"),
		resolucao: d.get("resolucao"),
		container: d.get("container"),
		audioFormato: d.get("audioFormato"),
		legendas: d.has("legendas"),
		legendasAuto: d.has("legendasAuto"),
		idiomas: limparIdiomas(d.get("idiomas") || ""),
		thumb: d.has("thumb"),
		metadados: d.has("metadados"),
		capitulos: d.has("capitulos"),
		sponsor: d.has("sponsor"),
		playlist: d.has("playlist"),
		recorte: d.has("recorte"),
		inicio: (d.get("inicio") || "").trim(),
		fim: (d.get("fim") || "").trim(),
	};
}

function montar(o) {
	const partes = ["yt-dlp"];

	if (o.modo === "audio") {
		partes.push("-x", "--audio-format", o.audioFormato);
		// 0 é a melhor qualidade na escala do yt-dlp (0 a 10). Não vale pro
		// opus e pro flac: o opus já vem assim do YouTube e não é reconvertido,
		// e o flac não tem perda pra regular.
		if (o.audioFormato === "mp3" || o.audioFormato === "m4a") {
			partes.push("--audio-quality", "0");
		}
	} else {
		// O mp4 pede faixas que já nascem compatíveis com mp4 (h264 + aac), pra
		// o ffmpeg só juntar em vez de reconverter — reconverter vídeo leva
		// minutos e perde qualidade. Se não houver, cai no melhor que tiver.
		// O mkv aceita qualquer codec, então vai direto no melhor.
		const seletor =
			o.container === "mp4"
				? "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b"
				: "bv*+ba/b";
		partes.push("-f", aspas(seletor));

		// -S res:N = a maior resolução que não passe de N. Diferente de filtrar
		// com [height<=N]: se o vídeo não tiver nada até N, o filtro falha e o
		// -S ainda baixa a menor que existir.
		if (o.resolucao !== "melhor") partes.push("-S", aspas(`res:${o.resolucao}`));

		partes.push("--merge-output-format", o.container);

		if (o.legendas) {
			partes.push("--write-subs");
			if (o.legendasAuto) partes.push("--write-auto-subs");
			partes.push("--sub-langs", aspas(o.idiomas), "--embed-subs");
		}
		if (o.capitulos) partes.push("--embed-chapters");
	}

	if (o.thumb) partes.push("--embed-thumbnail");
	if (o.metadados) partes.push("--embed-metadata");
	if (o.sponsor) partes.push("--sponsorblock-remove", "sponsor");

	if (o.recorte && tempoValido(o.inicio) && tempoValido(o.fim) && (o.inicio || o.fim)) {
		// O asterisco diz ao yt-dlp que é um intervalo de tempo e não o nome de
		// um capítulo. "inf" é o fim do vídeo.
		partes.push("--download-sections", aspas(`*${o.inicio || "0"}-${o.fim || "inf"}`));
	}

	partes.push(o.playlist ? "--yes-playlist" : "--no-playlist");

	// Numa playlist o número na frente mantém a ordem dos arquivos na pasta.
	const nome = o.playlist ? "%(playlist_index)s - %(title)s.%(ext)s" : "%(title)s.%(ext)s";
	partes.push("-o", aspas(nome));

	partes.push(aspas(o.url || "COLE_O_LINK_AQUI"));
	return partes.join(" ");
}

function tempoValido(t) {
	return !t || TEMPO.test(t);
}

/* ------------------------------------------------------------------ tela */

// Liga e desliga o que depende de outra escolha: os blocos de cada modo e os
// campos que só fazem sentido com uma caixa marcada. Desabilitado e não só
// escondido, pra o FormData não ler valor de campo que não está valendo.
function sincronizar(o) {
	for (const bloco of form.querySelectorAll("[data-modo]")) {
		const ativo = bloco.dataset.modo === o.modo;
		bloco.hidden = !ativo;
		for (const campo of bloco.querySelectorAll("input, select")) {
			// Os dependentes têm regra própria logo abaixo.
			if (!campo.closest(".ytd-dependente")) campo.disabled = !ativo;
		}
	}

	const legendasLigadas = o.modo === "video" && o.legendas;
	form.elements.legendasAuto.disabled = !legendasLigadas;
	form.elements.idiomas.disabled = !legendasLigadas;

	form.elements.inicio.disabled = !o.recorte;
	form.elements.fim.disabled = !o.recorte;
}

function avisar(o) {
	if (o.url && !/^https?:\/\//i.test(o.url)) {
		avisoUrl.textContent = "o link precisa começar com http:// ou https://";
	} else {
		avisoUrl.textContent = "";
	}

	if (o.recorte && (!tempoValido(o.inicio) || !tempoValido(o.fim))) {
		avisoTempo.textContent = "use minutos:segundos, tipo 1:30 ou 1:02:03";
	} else if (o.recorte && !o.inicio && !o.fim) {
		avisoTempo.textContent = "preencha o começo, o fim ou os dois";
	} else {
		avisoTempo.textContent = "";
	}
}

function atualizar() {
	// Primeiro sincroniza, depois lê de novo: desabilitar um campo muda o que o
	// FormData devolve, e o comando tem que refletir o estado já arrumado.
	sincronizar(ler());
	const o = ler();
	avisar(o);
	codigo.textContent = montar(o);
	botaoCopiar.textContent = "copiar";
}

/* ---------------------------------------------------------------- copiar */

async function copiar() {
	const texto = codigo.textContent;
	try {
		await navigator.clipboard.writeText(texto);
	} catch {
		// Sem a API (http comum, navegador velho, permissão negada): seleciona o
		// texto e usa o caminho antigo. Se nem isso der, pelo menos fica
		// selecionado e é só apertar Ctrl+C.
		const faixa = document.createRange();
		faixa.selectNodeContents(codigo);
		const selecao = window.getSelection();
		selecao.removeAllRanges();
		selecao.addRange(faixa);
		try {
			document.execCommand("copy");
		} catch {
			botaoCopiar.textContent = "selecionado — Ctrl+C";
			return;
		}
	}
	botaoCopiar.textContent = "copiado!";
}

form.addEventListener("input", atualizar);
form.addEventListener("change", atualizar);
// Enter no campo do link não deve recarregar a página.
form.addEventListener("submit", (evento) => evento.preventDefault());
botaoCopiar.addEventListener("click", copiar);

atualizar();
