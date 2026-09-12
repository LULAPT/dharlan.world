// curriculo.js — portão de senha da /curriculo/.
//
// A tela é a mesma caixa de "verify you are human" da /index/ (.verify-box do
// boot-terminal.css) com a checkbox trocada por um campo de senha, e o fundo é
// o mesmo dither WebGL do dither-bg.js.
//
// O conteúdo do currículo NÃO mora neste arquivo nem no HTML: quem chega pela
// URL veria tudo no view-source e o portão não valeria nada. Ele chega junto
// com a resposta de senha correta, vindo de uma Edge Function na Supabase
// (supabase/functions/curriculo/index.ts), que é também quem guarda a senha e
// segura a força bruta. Ver PLANO-CURRICULO.md.

document.addEventListener("DOMContentLoaded", () => {
	const portao = document.getElementById("portao");
	const caixa = document.getElementById("caixa-senha");
	const form = document.getElementById("form-senha");
	const campo = document.getElementById("campo-senha");
	const botao = document.getElementById("btn-entrar");
	const estado = document.getElementById("estado");
	const estadoTexto = document.getElementById("estado-texto");
	const linhaErro = document.getElementById("linha-erro");
	const artigo = document.getElementById("curriculo");
	if (!portao || !caixa || !form || !campo) return;

	const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

	// --- verificação ----------------------------------------------------------

	// A senha é conferida no servidor, nunca aqui. Este arquivo não sabe a senha
	// e não tem o currículo: os dois só existem do outro lado desta chamada.
	// Ver supabase/functions/curriculo/index.ts.
	const URL_FUNCAO =
		"https://kjdydlmwfmoksubebnot.supabase.co/functions/v1/curriculo";

	async function verificarSenha(senha) {
		const r = await fetch(URL_FUNCAO, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ senha }),
		});

		// 401 (senha errada) e 429 (tentativas demais) chegam aqui iguais, de
		// propósito: quem está tentando adivinhar não ganha a informação de que
		// acertou o formato ou de que foi bloqueado.
		if (!r.ok) return { ok: false };

		const corpo = await r.json();
		return { ok: true, dados: corpo.dados, pdfUrl: corpo.pdfUrl || null };
	}

	// --- abertura datilografada ---------------------------------------------

	// Quem já viu a tela (ou desativou animação) não deve ser obrigado a esperar
	// a digitação: qualquer clique ou tecla pula pro fim.
	let pular = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const pularTudo = () => (pular = true);
	caixa.addEventListener("pointerdown", pularTudo);
	document.addEventListener("keydown", pularTudo);

	async function digitar(elemento) {
		const texto = elemento.textContent;
		elemento.textContent = "";
		elemento.classList.add("digitando");

		for (const letra of texto) {
			if (pular) {
				elemento.textContent = texto;
				break;
			}
			elemento.textContent += letra;
			await esperar(22);
		}

		elemento.classList.remove("digitando");
	}

	async function abrirTerminal() {
		for (const passo of form.querySelectorAll("[data-passo]")) {
			passo.classList.remove("oculta");
			const comando = passo.querySelector("[data-digitar]");
			if (comando) await digitar(comando);
			if (!pular) await esperar(110);
		}
		// preventScroll porque o campo está no meio de uma seção fixed: sem ele o
		// Chrome dá um pulo na página ao focar.
		campo.focus({ preventScroll: true });
	}

	// --- quem está do outro lado ----------------------------------------------

	// Nome e versão do navegador, só pra linha do terminal ter o que dizer.
	// Farejar user agent é notoriamente frágil, mas aqui não faz mal nenhum:
	// é enfeite, e errar significa mostrar "unknown client" em vez de um nome.
	function detectarNavegador() {
		const ua = navigator.userAgent;

		// A ordem importa, porque quase todo navegador mente dizendo ser os
		// outros: Edge e Opera carregam "Chrome" no user agent, e o Chrome
		// carrega "Safari". Testar do mais específico pro mais genérico é o que
		// evita todo Edge do mundo se anunciar como Chrome.
		const marcas = [
			["Edg", "Edge"],
			["OPR", "Opera"],
			["SamsungBrowser", "Samsung Internet"],
			["Firefox", "Firefox"],
			["Chrome", "Chrome"],
			// O Safari não põe versão no "Safari/" — aquilo é build do WebKit.
			// A versão de verdade fica em "Version/".
			["Version", "Safari"],
		];

		for (const [chave, nome] of marcas) {
			const achou = ua.match(new RegExp(chave + "\\/(\\d+(?:\\.\\d+)?)"));
			if (achou) return nome + " " + achou[1];
		}

		return "unknown client";
	}

	// --- cadeado com defeito --------------------------------------------------

	// De tempos em tempos o desenho "buga": alguns blocos viram lixo de terminal
	// (@#$*%&) e uma linha às vezes some inteira, com o CSS piscando junto. São
	// rajadas curtas e espaçadas, não um blink contínuo — piscar sem parar vira
	// ruído visual e ainda compete com o cursor do campo de senha.
	//
	// Só troca caractere por caractere e nunca mexe na quantidade deles: a
	// coluna do grid é max-content, então uma linha que crescesse um caractere
	// empurraria o formulário do lado.
	function animarCadeado(arte) {
		if (!arte) return null;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

		const original = arte.textContent;
		const SUJEIRA = "@#$*%&?!/\\<>=+";

		// Posições que podem ser corrompidas: só onde tem bloco, pra silhueta do
		// cadeado continuar reconhecível no meio do defeito.
		const blocos = [];
		const linhas = [];
		let inicioLinha = 0;

		for (let i = 0; i <= original.length; i++) {
			if (i === original.length || original[i] === "\n") {
				linhas.push({ inicio: inicioLinha, fim: i });
				inicioLinha = i + 1;
			} else if (original[i] === "█") {
				blocos.push(i);
			}
		}
		if (!blocos.length) return null;

		let timer = null;
		let vivo = true;
		const sorteio = (n) => Math.floor(Math.random() * n);

		function desenhar(letras) {
			arte.textContent = letras.join("");
		}

		function restaurar() {
			arte.textContent = original;
			arte.classList.remove("com-defeito");
		}

		// Um quadro de defeito: lixo espalhado e, de vez em quando, uma linha
		// inteira apagada (queda de sinal).
		function quadroCorrompido() {
			const letras = original.split("");

			const quantidade = 3 + sorteio(10);
			for (let i = 0; i < quantidade; i++) {
				const pos = blocos[sorteio(blocos.length)];
				letras[pos] = SUJEIRA[sorteio(SUJEIRA.length)];
			}

			if (Math.random() < 0.35) {
				const linha = linhas[sorteio(linhas.length)];
				for (let i = linha.inicio; i < linha.fim; i++) {
					if (letras[i] !== "\n") letras[i] = " ";
				}
			}

			desenhar(letras);
		}

		// Uma falha são 2 a 4 quadros seguidos, não um piscar único — é o que dá
		// cara de sinal ruim em vez de animação de CSS.
		function falhar() {
			if (!vivo) return;
			arte.classList.add("com-defeito");

			let quadro = 0;
			const total = 2 + sorteio(3);

			(function proximo() {
				if (!vivo) return;
				if (quadro++ >= total) {
					restaurar();
					agendar();
					return;
				}
				quadroCorrompido();
				timer = setTimeout(proximo, 45 + sorteio(75));
			})();
		}

		function agendar() {
			timer = setTimeout(falhar, 1800 + sorteio(4000));
		}

		agendar();

		return function desligar() {
			vivo = false;
			clearTimeout(timer);
			restaurar();
		};
	}

	// --- estados da caixa -----------------------------------------------------

	function definirEstado(classe, texto) {
		estado.classList.remove("is-checking", "is-checked", "is-erro");
		if (classe) estado.classList.add(classe);
		if (texto) estadoTexto.textContent = texto;
	}

	function mostrarErro(tentativa) {
		definirEstado("is-erro", "access denied");
		linhaErro.textContent = `[ ERROR ] auth failure — attempt ${tentativa}`;
		linhaErro.hidden = false;

		// A classe precisa sair pra animação poder rodar de novo na tentativa
		// seguinte; sem isso o tremor só acontece uma vez.
		caixa.classList.add("senha-errada");
		setTimeout(() => caixa.classList.remove("senha-errada"), 400);

		campo.select();
	}

	// --- currículo liberado ---------------------------------------------------

	// Tudo com textContent, nunca innerHTML: na Fase 2 estes dados vêm de fora e
	// HTML de fora seria injeção direta na página.
	function elemento(tag, texto, classe) {
		const el = document.createElement(tag);
		if (texto) el.textContent = texto;
		if (classe) el.className = classe;
		return el;
	}

	// Os três ícones do bloco de contato, do jeito que estão no PDF: disco preto
	// com o desenho vazado em branco.
	const ICONES = {
		email:
			"M18 23h28a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V25a2 2 0 0 1 2-2Zm14 10.2 12-7.2H20l12 7.2Zm0 2.6L18 27.4V39h28V27.4L32 35.8Z",
		telefone:
			"M25.6 19c.9 0 1.7.5 2 1.4l2.2 5.3c.3.8.1 1.7-.5 2.3l-2.4 2.3a19 19 0 0 0 8.8 8.8l2.3-2.4c.6-.6 1.5-.8 2.3-.5l5.3 2.2c.9.3 1.4 1.1 1.4 2v5.3c0 1.3-1 2.3-2.3 2.3A26.7 26.7 0 0 1 18 21.3c0-1.3 1-2.3 2.3-2.3h5.3Z",
		endereco:
			"M32 16c-6.1 0-11 4.9-11 11 0 8.2 11 21 11 21s11-12.8 11-21c0-6.1-4.9-11-11-11Zm0 15a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
	};

	const SVG = "http://www.w3.org/2000/svg";

	function icone(nome) {
		const svg = document.createElementNS(SVG, "svg");
		svg.setAttribute("viewBox", "0 0 64 64");
		svg.setAttribute("aria-hidden", "true");

		const disco = document.createElementNS(SVG, "circle");
		disco.setAttribute("cx", "32");
		disco.setAttribute("cy", "32");
		disco.setAttribute("r", "32");
		disco.setAttribute("fill", "#000");
		svg.append(disco);

		const desenho = document.createElementNS(SVG, "path");
		desenho.setAttribute("fill", "#fff");
		desenho.setAttribute("d", ICONES[nome] || ICONES.email);
		svg.append(desenho);

		return svg;
	}

	// Um texto que no PDF quebra em várias linhas vira <br>, sem passar por
	// innerHTML.
	function paragrafo(linhas, classe) {
		const p = elemento("p", null, classe);
		const partes = Array.isArray(linhas) ? linhas : [linhas];
		partes.forEach((linha, i) => {
			if (i) p.append(document.createElement("br"));
			p.append(document.createTextNode(linha));
		});
		return p;
	}

	function montarSecao(secao) {
		const bloco = document.createElement("section");
		bloco.className = secao.tipo === "contato" ? "contato" : "";
		bloco.append(elemento("h2", secao.titulo));

		if (secao.tipo === "contato") {
			const lista = document.createElement("ul");
			for (const linha of secao.itens || []) {
				const li = document.createElement("li");
				li.append(icone(linha.icone));

				// O endereço ocupa três linhas no PDF; os outros, uma só.
				const span = document.createElement("span");
				const partes = Array.isArray(linha.texto) ? linha.texto : [linha.texto];
				partes.forEach((parte, i) => {
					if (i) span.append(document.createElement("br"));
					span.append(document.createTextNode(parte));
				});
				li.append(span);

				lista.append(li);
			}
			bloco.append(lista);
			return bloco;
		}

		if (secao.tipo === "texto") {
			bloco.classList.add("secao-texto");
			bloco.append(paragrafo(secao.texto));
			return bloco;
		}

		for (const item of secao.itens || []) {
			const div = elemento("div", null, item.cargo ? "item cargo" : "item");
			div.append(elemento("h3", item.titulo));

			for (const desc of item.descricoes || []) {
				div.append(paragrafo(desc, "desc"));
			}

			if (Array.isArray(item.marcadores) && item.marcadores.length) {
				const lista = elemento("ul", null, "marcadores");
				for (const m of item.marcadores) lista.append(elemento("li", m));
				div.append(lista);
			}

			bloco.append(div);
		}

		return bloco;
	}

	// Relógio de verdade, batendo a cada segundo.
	function ligarRelogio(alvo) {
		const dia = new Intl.DateTimeFormat("pt-BR", {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
		const hora = new Intl.DateTimeFormat("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		function bater() {
			const agora = new Date();
			alvo.textContent = dia.format(agora) + " · ";
			alvo.append(elemento("b", hora.format(agora)));
		}

		bater();
		// Acerta o passo com a virada do segundo antes de entrar no intervalo
		// fixo, senão o relógio pula de dois em dois de vez em quando.
		setTimeout(() => {
			bater();
			setInterval(bater, 1000);
		}, 1000 - (Date.now() % 1000));
	}

	function renderizarCurriculo(dados, pdfUrl) {
		artigo.textContent = "";
		if (!dados) return;

		// --- barra de cima (relógio + PDF), fora da folha ---
		const barra = elemento("div", null, null);
		barra.id = "curriculo-barra";

		const relogio = document.createElement("div");
		relogio.id = "curriculo-relogio";
		barra.append(relogio);

		const baixar = elemento("a", "Baixar em PDF");
		baixar.id = "curriculo-baixar";
		if (pdfUrl) {
			baixar.href = pdfUrl;
			baixar.target = "_blank";
			baixar.rel = "noopener noreferrer";
		} else {
			// Ainda sem endereço pro arquivo: fica visível mas inerte.
			baixar.setAttribute("role", "link");
			baixar.setAttribute("aria-disabled", "true");
		}
		barra.append(baixar);
		artigo.append(barra);

		// --- a folha ---
		const folha = elemento("div", null, "curriculo-folha");

		const cabecalho = document.createElement("header");
		cabecalho.append(elemento("h1", dados.nome, "nome"));
		if (dados.nascimento) {
			cabecalho.append(elemento("p", dados.nascimento, "nascimento"));
		}
		cabecalho.append(elemento("hr", null, "regua"));
		folha.append(cabecalho);

		if (dados.perfil) {
			const perfil = elemento("section", null, "perfil");
			perfil.append(elemento("h2", dados.perfil.titulo));
			perfil.append(elemento("p", dados.perfil.texto));
			folha.append(perfil);
		}

		const colunas = elemento("div", null, "colunas");
		for (const [lado, classe] of [
			["esquerda", "col-esq"],
			["direita", "col-dir"],
		]) {
			const col = elemento("div", null, classe);
			for (const secao of (dados.colunas && dados.colunas[lado]) || []) {
				col.append(montarSecao(secao));
			}
			colunas.append(col);
		}
		folha.append(colunas);
		artigo.append(folha);

		ligarRelogio(relogio);
	}

	// Troca o vestuário da página: fora as folhas de estilo do site, dentro a da
	// folha do currículo. Sem isso o style.css continuaria mandando fundo
	// pixelado, fonte e text-align: center no documento.
	function vestirFolha() {
		for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
			const daFolha = link.href.includes("curriculo-folha.css");
			link.disabled = !daFolha;
		}
		// Engrenagem e botão do rádio são do site, não do documento. Os dois
		// injetam o próprio <style>, então não some junto com os <link> acima.
		document.getElementById("settings-panel")?.remove();
		document.getElementById("settings-gear")?.remove();
		document.getElementById("radio-botao")?.remove();

		// O fade-in.js deixa opacity: 0 inline no body e só limpa quando a
		// animação termina. Se ela não terminar (movimento reduzido, aba em
		// segundo plano), o zero fica lá — e estilo inline ganha do CSS, então o
		// currículo abriria numa página em branco.
		document.body.style.opacity = "";
		document.body.style.animation = "";

		// className inteiro, não classList.remove: leva junto o crt, o
		// fade-enabled e o portao-ativo sem precisar listar cada um.
		document.body.className = "curriculo-aberto";
	}

	async function liberar(resposta) {
		definirEstado("is-checked", "access granted");
		await esperar(700);

		// Portão fora de cena: devolve a GPU do fundo, o rAF do brilho de borda e
		// o timer do cadeado, que continuariam rodando atrás do currículo.
		if (desligarGlow) desligarGlow();
		if (desligarDither) desligarDither();
		if (desligarCadeado) desligarCadeado();

		portao.classList.add("portao-saindo");
		await esperar(500);
		portao.remove();

		vestirFolha();
		renderizarCurriculo(resposta.dados, resposta.pdfUrl);
		artigo.hidden = false;
	}

	// --- envio ----------------------------------------------------------------

	let tentativas = 0;
	let ocupado = false;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const senha = campo.value.trim();
		if (ocupado || !senha) return;

		ocupado = true;
		botao.disabled = true;
		linhaErro.hidden = true;
		definirEstado("is-checking", "verifying credentials...");

		let resposta;
		try {
			resposta = await verificarSenha(senha);
		} catch (erro) {
			// Rede fora, função dormindo, CORS: pro visitante é tudo a mesma coisa.
			console.error("curriculo: falha na verificação —", erro);
			resposta = { ok: false };
		}

		if (resposta.ok) {
			await liberar(resposta);
			return;
		}

		tentativas++;
		mostrarErro(tentativas);
		ocupado = false;
		botao.disabled = false;
	});

	// --- início ---------------------------------------------------------------

	// definirRayId e ativarBorderGlow vêm do verify-box.js, carregado antes
	// deste arquivo; iniciarDitherBg vem do dither-bg.js.
	window.definirRayId(document.getElementById("verify-ray-id"));

	// Antes de abrirTerminal(), que é quem revela essa linha.
	const cliente = document.getElementById("cliente");
	if (cliente) cliente.textContent = detectarNavegador();

	const desligarGlow = window.ativarBorderGlow(caixa);
	const desligarDither = window.iniciarDitherBg
		? window.iniciarDitherBg(portao)
		: null;
	const desligarCadeado = animarCadeado(document.getElementById("portao-arte"));

	abrirTerminal();
});
