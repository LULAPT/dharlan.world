// setup.js — a /setup/ é um terminal fingindo rodar `fastfetch`.
//
// A página não tem header, footer nem breadcrumb: é só o terminal, o link de
// volta e os dois botões fixos que o main.js cria (engrenagem e rádio). Por não
// ter #nav-atual, ela precisa estar no mapa SEM_BREADCRUMB do page-title.js.
//
// Os dados são estáticos de propósito. O navegador não lê hardware — modelo de
// CPU, VRAM, discos e monitores são impossíveis em JS, e o pouco que dá
// (deviceMemory, WEBGL_debug_renderer_info) vem arredondado ou mascarado. Então
// é a saída de um fastfetch de verdade, congelada no JSON.

const CAMINHO = "/assets/json/setup-specs.json";
const VELOCIDADE_DIGITACAO = 70;
const PAUSA_ANTES_DA_SAIDA = 260;

function esperar(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function semAnimacao() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function criar(tag, classe, texto) {
	const el = document.createElement(tag);
	if (classe) el.className = classe;
	if (texto !== undefined) el.textContent = texto;
	return el;
}

// O fastfetch pinta a porcentagem conforme o uso: tranquilo, apertando,
// cheio. É semântico, não decorativo, por isso escapa da cor do tema.
function faixaDeUso(percentual) {
	if (percentual >= 75) return "cheio";
	if (percentual >= 50) return "medio";
	return "tranquilo";
}

function montarLinha(linha) {
	const el = criar("div", "ff-linha");
	el.appendChild(criar("span", "ff-rotulo", `${linha.rotulo}:`));

	const valor = criar("span", "ff-valor");
	valor.appendChild(document.createTextNode(linha.valor));

	if (typeof linha.percentual === "number") {
		valor.appendChild(document.createTextNode(" "));
		const pct = criar("span", "ff-pct", `(${linha.percentual}%)`);
		pct.dataset.uso = faixaDeUso(linha.percentual);
		valor.appendChild(pct);
	}

	if (linha.sufixo) {
		valor.appendChild(document.createTextNode(` ${linha.sufixo}`));
	}

	el.appendChild(valor);
	return el;
}

// A régua de cores que o fastfetch imprime no fim da saída.
function montarPaleta() {
	const paleta = criar("div", "ff-paleta");
	paleta.setAttribute("aria-hidden", "true");
	for (let i = 0; i < 8; i++) paleta.appendChild(criar("span"));
	return paleta;
}

function montarSaida(dados) {
	const saida = criar("div", "ff-saida");

	// A arte do Windows está DESLIGADA. Como <pre> dentro do flex ela ocupava a
	// largura inteira do contêiner (1212px medidos no Brave, pra 35 colunas de
	// ~6px cada), espremia a coluna de dados a zero e jogava tudo pra fora da
	// tela. No celular não dava pra perceber, porque o @media já escondia a
	// arte — por isso quebrava só no desktop.
	//
	// O fetch do caelestia, que é a referência desta página, também roda sem
	// logo ("logo": null no config dele). A arte continua no setup-specs.json:
	// religar é descomentar as quatro linhas abaixo (e resolver a largura).
	//
	// if (Array.isArray(dados.logo) && dados.logo.length) {
	// 	const logo = criar("pre", "ff-logo", dados.logo.join("\n"));
	// 	logo.setAttribute("aria-hidden", "true");
	// 	saida.appendChild(logo);
	// }

	const infos = criar("div", "ff-infos");

	const titulo = criar("div", "ff-titulo");
	titulo.appendChild(criar("span", "ff-usuario", dados.usuario || "dharlan"));
	titulo.appendChild(document.createTextNode("@"));
	titulo.appendChild(criar("span", "ff-host", dados.host || "localhost"));
	infos.appendChild(titulo);

	// O traço do fastfetch tem exatamente a largura do "user@host" de cima.
	const larguraTitulo =
		`${dados.usuario || "dharlan"}@${dados.host || "localhost"}`.length;
	infos.appendChild(criar("div", "ff-divisor", "-".repeat(larguraTitulo)));

	(dados.linhas || []).forEach((linha) => infos.appendChild(montarLinha(linha)));
	infos.appendChild(montarPaleta());

	saida.appendChild(infos);
	return saida;
}

function montarPrompt(textoPrompt) {
	const linha = criar("div", "ff-linha-prompt");
	linha.appendChild(criar("span", "ff-prompt", textoPrompt));
	linha.appendChild(document.createTextNode(" "));
	return linha;
}

async function digitar(destino, texto) {
	if (semAnimacao()) {
		destino.textContent = texto;
		return;
	}
	for (const caractere of texto) {
		destino.textContent += caractere;
		await esperar(VELOCIDADE_DIGITACAO);
	}
}

export async function montarSetup() {
	const tela = document.getElementById("setup-terminal");
	if (!tela) return;

	let dados;
	try {
		const resposta = await fetch(CAMINHO);
		if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
		dados = await resposta.json();
	} catch (erro) {
		// Mesma postura do resto do site: falhou, a página continua de pé.
		console.error("setup.js:", erro.message);
		tela.appendChild(
			criar("div", "ff-erro", "fastfetch: não consegui ler as specs agora.")
		);
		return;
	}

	const textoPrompt = dados.prompt || "dharlan@world:~$";

	// 1) o comando sendo digitado
	const linhaComando = montarPrompt(textoPrompt);
	const comando = criar("span", "ff-comando");
	const cursor = criar("span", "ff-cursor", "▋");
	linhaComando.appendChild(comando);
	linhaComando.appendChild(cursor);
	tela.appendChild(linhaComando);

	await digitar(comando, dados.comando || "fastfetch");
	cursor.remove();
	await esperar(semAnimacao() ? 0 : PAUSA_ANTES_DA_SAIDA);

	// 2) a saída, de uma vez — é assim que o fastfetch imprime de verdade
	tela.appendChild(montarSaida(dados));

	// 3) o prompt de volta, esperando um comando que não vai vir
	const linhaFinal = montarPrompt(textoPrompt);
	linhaFinal.appendChild(criar("span", "ff-cursor", "▋"));
	tela.appendChild(linhaFinal);
}

document.addEventListener("DOMContentLoaded", montarSetup);
