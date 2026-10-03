// char-somehow.js — montador de personagem em camadas.
//
// O acervo vem do CharacterManaJ (pacote Default v3), convertido pra
// assets/json/char-somehow.json na importação: categorias, camadas, ordem de
// desenho e grupo de cor de cada camada, com os rótulos já em português.
//
// Como funciona a composição: uma peça costuma existir em VÁRIAS camadas da
// mesma categoria ao mesmo tempo. "Blazer", por exemplo, tem um arquivo em
// body_back (pele), body_front (roupa) e body_front_color (cor). Escolher a
// peça desenha todos os arquivos com aquele nome, cada um no seu z-index.

(function () {
	const canvas = document.getElementById("canvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	const painels = document.getElementById("painels");

	let spec = null;
	// Peça escolhida por categoria: { idCategoria: nomeDoArquivo }
	const escolha = {};
	// Cor escolhida por grupo: { "color-hair": "#a0522d" | null }
	const cores = {};

	const cacheImagem = new Map();
	const cacheColorido = new Map();

	// Paleta de cabelo. Traz tons naturais e alguns fantasiosos, que é o
	// espírito do gerador original.
	const CORES_CABELO = [
		"#2b2b33", "#4a3728", "#6b4423", "#8b5a2b", "#a9713f",
		"#c98f5a", "#d9b382", "#e8d4a0", "#f0e6d2",
		"#7a3030", "#b03d3d", "#d16a8a", "#e79ab8",
		"#5a3b7a", "#7b5aa6", "#3d5a8a", "#4a86b0",
		"#3a6b52", "#5f9668", "#9aa87a", "#8f9499",
	];

	// Tons de pele, do mais claro ao mais escuro. Cada cor é o tom do meio da
	// pele (o que o desenho original pinta de rosado); luz e sombra saem dela.
	const CORES_PELE = [
		["#f6dccd", "muito clara"],
		["#eac1a3", "clara"],
		["#d9a47e", "morena clara"],
		["#c08559", "parda"],
		["#a5693f", "morena"],
		["#8a5230", "morena escura"],
		["#6b3d24", "negra"],
		["#4a2a1a", "negra retinta"],
	];

	function caminho(dir, arquivo) {
		return "/assets/img/char-somehow/" + dir + "/" + arquivo;
	}

	function carregarImagem(src) {
		if (cacheImagem.has(src)) return cacheImagem.get(src);
		const p = new Promise(function (resolve) {
			const img = new Image();
			img.onload = function () { resolve(img); };
			// Peça que não existe naquela camada é situação normal: resolve
			// como nulo e o desenho pula.
			img.onerror = function () { resolve(null); };
			img.src = src;
		});
		cacheImagem.set(src, p);
		return p;
	}

	// ---------------------------------------------------------------
	// Recolorir
	// ---------------------------------------------------------------

	function hexParaHsl(hex) {
		const n = parseInt(hex.slice(1), 16);
		const r = ((n >> 16) & 255) / 255;
		const g = ((n >> 8) & 255) / 255;
		const b = (n & 255) / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2;
		let h = 0;
		let s = 0;
		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
			else if (max === g) h = ((b - r) / d + 2) / 6;
			else h = ((r - g) / d + 4) / 6;
		}
		return { h: h, s: s, l: l };
	}

	function matizParaCanal(p, q, t) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}

	// Troca matiz e saturação de cada pixel pelos do alvo, preservando a
	// luminância original — é ela que carrega o sombreado do desenho. A
	// luminância ainda é deslocada um pouco na direção do alvo, senão uma cor
	// escura escolhida sairia clara e uma clara sairia escura.
	function colorizar(img, hex) {
		const alvo = hexParaHsl(hex);
		const fora = document.createElement("canvas");
		fora.width = img.naturalWidth || img.width;
		fora.height = img.naturalHeight || img.height;
		const fctx = fora.getContext("2d", { willReadFrequently: true });
		fctx.drawImage(img, 0, 0);

		const dados = fctx.getImageData(0, 0, fora.width, fora.height);
		const px = dados.data;
		const desloc = (alvo.l - 0.5) * 0.6;

		for (let i = 0; i < px.length; i += 4) {
			if (px[i + 3] === 0) continue; // pixel transparente: nem toca

			const r = px[i] / 255;
			const g = px[i + 1] / 255;
			const b = px[i + 2] / 255;
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			let l = (max + min) / 2;

			l = Math.min(1, Math.max(0, l + desloc));

			const s = alvo.s;
			const h = alvo.h;
			let nr, ng, nb;
			if (s === 0) {
				nr = ng = nb = l;
			} else {
				const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				const p = 2 * l - q;
				nr = matizParaCanal(p, q, h + 1 / 3);
				ng = matizParaCanal(p, q, h);
				nb = matizParaCanal(p, q, h - 1 / 3);
			}

			px[i] = Math.round(nr * 255);
			px[i + 1] = Math.round(ng * 255);
			px[i + 2] = Math.round(nb * 255);
		}

		fctx.putImageData(dados, 0, 0);
		return fora;
	}

	// A pele precisa de outra conta. O colorizar() acima preserva a claridade
	// do desenho, o que serve pro cabelo mas não aqui: a pele original é clara,
	// e um tom escuro sairia desbotado. Aqui a claridade de cada pixel é
	// escalada pela razão entre o tom escolhido e o tom de pele do desenho —
	// sombra e contorno continuam proporcionalmente mais escuros, e o brilho
	// continua mais claro, só que mais contido em pele escura.
	//
	// Todo pixel da camada acompanha o tom escolhido, inclusive os acinzentados
	// da borda (a transição entre a pele e o contorno, ou o transparente): de
	// fora, eles ficavam claros e pontilhavam a borda de pele escura.
	//
	// O "rosto pálido" tem uma sombra azul por cima da pele, com uma transição
	// lilás. Esses tons frios guardam a cor (senão o rosto perde o efeito), mas
	// escurecem na mesma proporção da pele: em pele escura, o azul claro
	// destoava em vez de ler como sombra.
	//
	// O tom-base da pele no desenho, por camada: o artista pinta o rosto claro
	// (o rosado é só a bochecha) e braços e pernas em salmão. Com uma
	// referência só, um dos dois saía errado — rosto laranja e brilhante, ou
	// braço quase preto. Cada camada medida pela sua, os dois caem no tom
	// escolhido.
	const PELE_DO_DESENHO = {
		head: hexParaHsl("#f8e8e0"),
		body_back: hexParaHsl("#f0a098"),
	};

	function colorizarPele(img, hex, dir) {
		const base = PELE_DO_DESENHO[dir] || PELE_DO_DESENHO.body_back;
		const alvo = hexParaHsl(hex);
		const fora = document.createElement("canvas");
		fora.width = img.naturalWidth || img.width;
		fora.height = img.naturalHeight || img.height;
		const fctx = fora.getContext("2d", { willReadFrequently: true });
		fctx.drawImage(img, 0, 0);

		const dados = fctx.getImageData(0, 0, fora.width, fora.height);
		const px = dados.data;
		const baseL = base.l;

		for (let i = 0; i < px.length; i += 4) {
			if (px[i + 3] === 0) continue;
			const { h, s, l } = hexParaHsl(
				"#" + ((1 << 24) | (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]).toString(16).slice(1)
			);
			const frio = h > 0.45 && h < 0.9 && s > 0.08;

			const nl =
				l <= baseL
					? (l * alvo.l) / baseL
					: alvo.l + ((l - baseL) / (1 - baseL)) * (1 - alvo.l) * 0.5;

			let nh, ns;
			if (frio) {
				// Mesma cor, só mais contida quanto mais escura a pele.
				nh = h;
				ns = s * (0.5 + 0.5 * Math.min(1, alvo.l / baseL));
			} else {
				// A saturação acompanha a do pixel em relação à da pele original,
				// pra sombra e brilho não ficarem todos iguais — mas sem passar da
				// do tom escolhido, senão a bochecha rosada vira laranja em pele
				// escura.
				nh = alvo.h;
				ns = alvo.s * Math.min(1, s / base.s);
			}

			const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
			const p = 2 * nl - q;
			px[i] = Math.round(matizParaCanal(p, q, nh + 1 / 3) * 255);
			px[i + 1] = Math.round(matizParaCanal(p, q, nh) * 255);
			px[i + 2] = Math.round(matizParaCanal(p, q, nh - 1 / 3) * 255);
		}

		fctx.putImageData(dados, 0, 0);
		return fora;
	}

	// pele: a pasta da camada (head, body_back) quando ela é de pele.
	async function obterCamada(src, hex, pele) {
		if (!hex) return carregarImagem(src);
		const chave = src + "|" + (pele ? "pele|" : "") + hex;
		if (cacheColorido.has(chave)) return cacheColorido.get(chave);

		const p = carregarImagem(src).then(function (img) {
			if (!img) return null;
			return pele ? colorizarPele(img, hex, pele) : colorizar(img, hex);
		});
		cacheColorido.set(chave, p);
		return p;
	}

	// ---------------------------------------------------------------
	// Composição
	// ---------------------------------------------------------------

	// Junta as peças de todas as camadas da categoria: é a lista que o painel
	// mostra.
	function itensDaCategoria(cat) {
		const mapa = new Map();
		cat.camadas.forEach(function (camada) {
			camada.itens.forEach(function (item) {
				if (!mapa.has(item.arquivo)) mapa.set(item.arquivo, item.nome);
			});
		});
		return [...mapa.entries()].sort(function (a, b) {
			return a[1].localeCompare(b[1], "pt-BR");
		});
	}

	function filaDeDesenho() {
		const fila = [];
		spec.categorias.forEach(function (cat) {
			const arquivo = escolha[cat.id];
			if (!arquivo) return;
			cat.camadas.forEach(function (camada) {
				const tem = camada.itens.some(function (i) {
					return i.arquivo === arquivo;
				});
				if (!tem) return;
				fila.push({
					ordem: camada.ordem,
					src: caminho(camada.dir, arquivo),
					// A camada só é recolorida se a especificação disser a que
					// grupo de cor ela pertence. É por isso que mudar o cabelo
					// pega frente e trás de uma vez, sem eu fixar nada aqui.
					cor: camada.grupoCor ? cores[camada.grupoCor] || null : null,
					pele: camada.grupoCor === "color-skin" ? camada.dir : null,
				});
			});
		});
		fila.sort(function (a, b) { return a.ordem - b.ordem; });
		return fila;
	}

	let desenhoAtual = 0;
	async function desenhar() {
		const meu = ++desenhoAtual;
		const fila = filaDeDesenho();
		const camadas = await Promise.all(fila.map(function (p) {
			return obterCamada(p.src, p.cor, p.pele);
		}));
		// Outro desenho começou enquanto este carregava: descarta.
		if (meu !== desenhoAtual) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		camadas.forEach(function (c) {
			if (c) ctx.drawImage(c, 0, 0, canvas.width, canvas.height);
		});
	}

	// ---------------------------------------------------------------
	// Interface
	// ---------------------------------------------------------------

	// paleta: lista de [hex, nome] — o nome vira o título da amostra.
	function montarPainelCor(grupo, paleta, livreInicial) {
		const painel = document.createElement("div");
		painel.className = "painel painel-cor";
		painel.dataset.grupo = grupo.id;

		const titulo = document.createElement("h2");
		titulo.textContent = "Cor — " + grupo.nome;
		painel.appendChild(titulo);

		const conteudo = document.createElement("div");
		conteudo.className = "conteudo";

		function marcar(botao) {
			conteudo.querySelectorAll("button").forEach(function (b) {
				b.classList.remove("ativo");
			});
			if (botao) botao.classList.add("ativo");
		}

		// "Original": desliga o recolorir e mostra a arte como veio.
		const original = document.createElement("button");
		original.type = "button";
		original.className = "amostra original ativo";
		original.title = "Cor original";
		original.addEventListener("click", function () {
			cores[grupo.id] = null;
			marcar(original);
			desenhar();
		});
		conteudo.appendChild(original);

		paleta.forEach(function ([hex, nome]) {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "amostra";
			b.style.backgroundColor = hex;
			b.title = nome;
			b.addEventListener("click", function () {
				cores[grupo.id] = hex;
				marcar(b);
				desenhar();
			});
			conteudo.appendChild(b);
		});

		// Seletor livre, pra qualquer cor fora da paleta.
		const livre = document.createElement("input");
		livre.type = "color";
		livre.className = "amostra-livre";
		livre.title = "Escolher outra cor";
		livre.value = livreInicial;
		livre.addEventListener("input", function () {
			cores[grupo.id] = livre.value;
			marcar(null);
			desenhar();
		});
		conteudo.appendChild(livre);

		painel.appendChild(conteudo);
		return painel;
	}

	function montarPainels() {
		painels.innerHTML = "";

		spec.categorias.forEach(function (cat) {
			const itens = itensDaCategoria(cat);
			if (!itens.length) return; // categoria sem arte nenhuma

			const painel = document.createElement("div");
			painel.className = "painel";
			painel.dataset.categoria = cat.id;

			const titulo = document.createElement("h2");
			titulo.textContent = cat.nome;
			painel.appendChild(titulo);

			const lista = document.createElement("div");
			lista.className = "lista";
			itens.forEach(function (par) {
				const b = document.createElement("button");
				b.type = "button";
				b.textContent = par[1];
				b.title = par[1];
				b.dataset.arquivo = par[0];
				b.addEventListener("click", function () {
					// Clicar de novo na peça ativa desmarca, se a categoria
					// puder ficar vazia.
					if (escolha[cat.id] === par[0] && cat.opcional) {
						delete escolha[cat.id];
					} else {
						escolha[cat.id] = par[0];
					}
					sincronizar();
					desenhar();
				});
				lista.appendChild(b);
			});
			painel.appendChild(lista);
			painels.appendChild(painel);

			// A cor entra logo depois de "Cabelo — trás", ou seja, ao lado das
			// duas caixas de cabelo. Antes eu punha depois de "Cabelo — frente",
			// o que separava o par frente/trás no meio — era isso que
			// bagunçava o fluxo dos painéis.
			if (cat.id === "hair_back") {
				const grupo = spec.gruposDeCor.find(function (g) {
					return g.id === "color-hair";
				});
				if (grupo) {
					const paleta = CORES_CABELO.map(function (hex) { return [hex, hex]; });
					painels.appendChild(montarPainelCor(grupo, paleta, "#8b5a2b"));
				}
			}

			// A cor da pele entra logo depois do Rosto, que é onde ela mais
			// aparece. Ela pinta o rosto e a pele do corpo juntos (as duas
			// camadas são do grupo color-skin no acervo).
			if (cat.id === "head") {
				const grupo = spec.gruposDeCor.find(function (g) {
					return g.id === "color-skin";
				});
				if (grupo) painels.appendChild(montarPainelCor(grupo, CORES_PELE, "#c08559"));
			}
		});
	}

	function sincronizar() {
		painels.querySelectorAll(".painel[data-categoria]").forEach(function (p) {
			const id = p.dataset.categoria;
			p.querySelectorAll(".lista button").forEach(function (b) {
				b.classList.toggle("ativo", escolha[id] === b.dataset.arquivo);
			});
		});
	}

	function aleatorio() {
		spec.categorias.forEach(function (cat) {
			const itens = itensDaCategoria(cat);
			if (!itens.length) return;
			// Categoria opcional às vezes fica vazia mesmo, senão sai sempre um
			// personagem coberto de acessório.
			if (cat.opcional && Math.random() < 0.45) {
				delete escolha[cat.id];
			} else {
				escolha[cat.id] = itens[Math.floor(Math.random() * itens.length)][0];
			}
		});
		sincronizar();
		desenhar();
	}

	function limpar() {
		Object.keys(escolha).forEach(function (k) { delete escolha[k]; });
		sincronizar();
		desenhar();
	}

	function salvar() {
		canvas.toBlob(function (blob) {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "char-somehow.png";
			document.body.appendChild(a);
			a.click();
			a.remove();
			// Revogar na hora chega a cancelar o download em alguns navegadores.
			setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
		}, "image/png");
	}

	document.getElementById("btn-aleatorio").addEventListener("click", aleatorio);
	document.getElementById("btn-limpar").addEventListener("click", limpar);
	document.getElementById("btn-salvar").addEventListener("click", salvar);

	fetch("/assets/json/char-somehow.json", { cache: "no-cache" })
		.then(function (r) {
			if (!r.ok) throw new Error("falha ao carregar char-somehow.json");
			return r.json();
		})
		.then(function (dados) {
			spec = dados;
			canvas.width = spec.tamanho.largura;
			canvas.height = spec.tamanho.altura;
			montarPainels();
			aleatorio();
		})
		.catch(function (e) {
			console.error("char-somehow:", e);
			painels.innerHTML = '<div id="carregando">Erro ao carregar o acervo.</div>';
		});

	// O dot field é o fundo desta página, igual ao da /wishlist/.
	if (window.iniciarDotField) window.iniciarDotField();
})();
