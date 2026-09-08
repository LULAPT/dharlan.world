// wishlist.js — espalha os itens da /wishlist/, deixa arrastar e faz eles se
// acomodarem sozinhos.
//
// Os itens vêm de assets/json/wishlist.json, como o resto do conteúdo dinâmico
// do site. Trocar a lista = trocar o JSON, sem encostar no HTML.
//
// A lógica de acomodação é portada do toybox.js (Dante Scanline, 2022,
// domínio público) que a lista de desejos original usa: cada item tem uma
// posição "física" e uma posição visual que persegue a física com atraso;
// logo depois do surgimento eles se empurram por alguns segundos até parar de
// se sobrepor. É isso que dá a sensação de reagrupamento.

(function () {
	const CONFIG = {
		// Tamanho base. O tamanho real é esse multiplicado por uma escala
		// calculada a partir da viewport — ver escalaParaCaber(). É o que faz
		// os 32 itens caberem tanto num monitor quanto num celular sem gerar
		// rolagem.
		larguraMin: 90,
		larguraMax: 165,
		// Fração da tela que o conjunto dos itens deve ocupar — é o botão de
		// "tamanho geral". A escala sai da raiz quadrada disso, então subir de
		// 0.42 pra 0.60 dá uns 20% a mais de tamanho em cada item.
		coberturaAlvo: 0.6,
		escalaMin: 0.38,
		// Teto alto o bastante pra telas grandes de fato crescerem: com 1.15 o
		// desktop batia no limite e o aumento não aparecia.
		escalaMax: 1.45,
		giroMax: 9, // inclinação máxima, em graus
		margem: 8, // folga das bordas laterais
		topoLivre: 8, // folga a partir do topo da PÁGINA, pro sorteio
		rodapeLivre: 2, // folga no pé da área, pro sorteio
		// Proporção média real das imagens da wishlist (~1.65). Serve pra
		// reservar altura antes de a imagem carregar.
		alturaEstimada: 1.6,
		atrasoEntrada: 45, // ms entre o surgimento de um item e o próximo
	};

	// Retorno elástico: o item pode ser arrastado e arremessado pra fora da
	// tela à vontade, mas assim que é solto uma mola o traz de volta. Não é
	// barreira — durante o arraste nada segura, ele só não fica lá fora.
	const RETORNO = {
		mola: 0.11, // quanto da distância de volta é vencida a cada frame
		freio: 0.55, // quanto da velocidade sobra ao passar do limite
	};

	// Física do arraste — os mesmos números pra todos os itens, de propósito.
	const FISICA = {
		// Quanto o item persegue o cursor a cada frame enquanto arrastado. É o
		// que dá peso: ele atrasa em relação à mão em vez de grudar 1:1.
		arrasto: 0.2,
		// Quanto a posição visual persegue a física a cada frame (o MOVE_EASING
		// do toybox). Suaviza tanto o empurrão da colisão quanto a inércia.
		suavizacao: 0.18,
		atrito: 0.87, // velocidade que sobrevive a cada frame depois de solto
		velocidadeMin: 0.15, // abaixo disso considera parado
		velocidadeMax: 42, // teto, pra um arremesso violento não sumir da tela
	};

	// Acomodação inicial: por alguns segundos os itens sobrepostos se empurram.
	const COLISAO = {
		forca: 32, // pixels de empurrão por frame na posição física
		fatorGrande: 3, // item bem maior empurra bem mais forte
		folgaFinal: 900, // ms de colisão depois que o último item surgiu
	};

	// Aleatório com semente: o espalhamento muda a cada carregamento, mas todos
	// os itens usam o mesmo fluxo, então dá pra depurar fixando a semente.
	let semente = Math.floor(Math.random() * 1e9);
	function aleatorio() {
		semente = (semente * 1664525 + 1013904223) % 4294967296;
		return semente / 4294967296;
	}

	function entre(min, max) {
		return min + aleatorio() * (max - min);
	}

	const area = document.getElementById("wishlist");
	const carregando = document.getElementById("wishlist-carregando");
	if (!area) return;

	const ehMobile = window.matchMedia("(max-width: 1024px)").matches;

	// Área da viewport, em coordenadas do #wishlist. Não funciona como barreira
	// durante o arraste — só define pra onde a mola de retorno puxa quando o
	// item é solto fora da tela.
	const limites = { x0: 0, x1: 0, y0: 0, y1: 0 };

	// Estado de cada item. x/y é a posição "física" (pra onde ele quer ir);
	// vx/vy é a inércia depois de solto; visualX/visualY é o que aparece na
	// tela, perseguindo a física com atraso.
	const estados = [];
	let loop = null;
	let colisoesAte = 0;

	function montarItem(dado) {
		const item = document.createElement("div");
		item.className = "wishlist-item";

		const img = document.createElement("img");
		img.src = dado.img;
		img.alt = dado.nome || "";
		img.loading = "lazy";
		img.decoding = "async";
		// Sem isso o navegador inicia o drag-and-drop nativo de imagem/link ao
		// arrastar, o que cancela a sequência de pointermove e o item trava.
		img.draggable = false;

		// Ao carregar, a altura real do item aparece — pode ser maior que o
		// chute e deixar ele passando do pé da tela. O loop precisa acordar pra
		// mola perceber isso e trazer de volta.
		img.addEventListener("load", function () { acordarLoop(); }, { once: true });

		// O tooltip do site lê o atributo title e move pra data-smt-title.
		const titulo = dado.desc ? dado.nome + ": " + dado.desc : dado.nome;
		if (titulo) item.title = titulo;

		// O pop de escala vive neste wrapper, separado da rotação (que fica no
		// .wishlist-item externo) — os dois transforms não colidem.
		const pop = document.createElement("div");
		pop.className = "wishlist-item-pop";

		if (dado.href) {
			const a = document.createElement("a");
			a.href = dado.href;
			a.target = "_blank";
			a.rel = "noopener";
			a.draggable = false;
			a.appendChild(img);
			pop.appendChild(a);
		} else {
			pop.appendChild(img);
		}
		item.appendChild(pop);

		return item;
	}

	// Retângulo do header, em coordenadas relativas ao #wishlist. É a zona
	// proibida pro SORTEIO — logo, Sobre, Galeria, Save, Outros, Utils. O
	// usuário ainda pode arrastar um item pra lá depois, e a colisão também
	// pode empurrar um pra cima dela; a regra vale só pra onde ele nasce.
	function medirZonaHeader() {
		// Mede só o que é de fato clicável — o título e a nav — e não a caixa do
		// header inteira. A caixa carrega "margin: 1.7rem 3.5rem 4.5rem" no
		// #header-wrap e ocupa a largura toda da página: usá-la reservava uma
		// faixa de ~127px cheia de margem vazia, empurrando todos os itens pra
		// baixo e deixando o topo deserto.
		const alvos = ehMobile
			? document.querySelectorAll("#title-mobile")
			: document.querySelectorAll("#header-titulo-compacto, #header-compacta nav");
		if (!alvos.length) return null;

		const ar = area.getBoundingClientRect();
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

		alvos.forEach(function (el) {
			const r = el.getBoundingClientRect();
			if (!r.width || !r.height) return;
			x0 = Math.min(x0, r.left - ar.left);
			y0 = Math.min(y0, r.top - ar.top);
			x1 = Math.max(x1, r.right - ar.left);
			y1 = Math.max(y1, r.bottom - ar.top);
		});

		if (x0 === Infinity) return null;

		// Uma folga pequena em volta: o suficiente pra não nascer colado nos
		// links, sem voltar a ser a faixa gigante de antes.
		const folga = 10;
		return { x0: x0 - folga, y0: y0 - folga, x1: x1 + folga, y1: y1 + folga };
	}

	// Até onde o sorteio pode ir, verticalmente. Hoje: a borda de cima da
	// engrenagem de configurações (#settings-panel, fixed no canto inferior
	// esquerdo). Serve só pro nascimento — a mola e o arraste continuam
	// livres até o pé da viewport.
	function tetoDoSorteio(alturaArea) {
		const engrenagem = document.getElementById("settings-panel");
		if (engrenagem) {
			const r = engrenagem.getBoundingClientRect();
			if (r.height) {
				const ar = area.getBoundingClientRect();
				return r.top - ar.top - CONFIG.margem;
			}
		}
		// O settings-panel é criado pelo main.js, que é módulo (adiado). Se
		// ainda não existir, usa a medida equivalente: 20px do rodapé + 40px
		// de altura da engrenagem.
		return alturaArea - 60 - CONFIG.margem;
	}

	function sobrepoe(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
		return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
	}

	// Encolhe (ou cresce) os itens pra que o conjunto ocupe uma fração alvo da
	// tela. Sem isso, 32 itens no tamanho de desktop não cabem num celular sem
	// gerar rolagem — e rolagem é justamente o que esta página não pode ter.
	function escalaParaCaber(quantidade, largura, altura) {
		const larguraMedia = (CONFIG.larguraMin + CONFIG.larguraMax) / 2;
		const areaPorItem = larguraMedia * larguraMedia * CONFIG.alturaEstimada;
		const disponivel = largura * altura * CONFIG.coberturaAlvo;
		const escala = Math.sqrt(disponivel / (quantidade * areaPorItem));
		return Math.min(Math.max(escala, CONFIG.escalaMin), CONFIG.escalaMax);
	}

	// Trava a área na viewport: header + #wishlist somam exatamente a altura da
	// tela, então não sobra nada pra rolar. Devolve o deslocamento do topo,
	// que é o que converte "topo da página" em coordenada local do #wishlist.
	function ajustarAlturaDaViewport() {
		area.style.minHeight = "0";
		area.style.height = "auto";
		const deslocamentoTopo = area.getBoundingClientRect().top + window.scrollY;
		const disponivel = Math.max(200, window.innerHeight - deslocamentoTopo);
		area.style.height = disponivel + "px";
		return deslocamentoTopo;
	}

	function espalhar(itens) {
		const deslocamentoTopo = ajustarAlturaDaViewport();

		const largura = area.clientWidth;
		const altura = area.clientHeight;

		const x0 = CONFIG.margem;
		const x1 = largura - CONFIG.margem;

		// Faixa vertical = a viewport inteira. Como o #wishlist começa abaixo do
		// header, alcançar o topo da página exige top negativo — daí o
		// deslocamento. Isto não é barreira: é o alvo da mola de retorno e o
		// intervalo do sorteio.
		const y0 = -deslocamentoTopo + CONFIG.topoLivre;
		const y1 = altura - CONFIG.rodapeLivre;

		// A mola usa a viewport inteira — arrastar pra qualquer canto continua
		// valendo, inclusive lá embaixo.
		limites.x0 = x0;
		limites.x1 = x1;
		limites.y0 = y0;
		limites.y1 = y1;

		// O SORTEIO, porém, para na altura da engrenagem de configurações. Só
		// isso já joga a distribuição toda pra cima, que é o ajuste em teste.
		const y1Sorteio = Math.max(y0 + 100, tetoDoSorteio(altura));

		const zonaHeader = medirZonaHeader();

		// Posição aleatória de verdade, não grade com jitter — mesmo embaralhada,
		// uma grade ainda tem malha por baixo, dá pra sentir o alinhamento. Se
		// cair em cima de outro item ou do header, sorteia de novo. A colisão
		// logo em seguida resolve o que sobrar de sobreposição.
		const colocados = [];
		const TENTATIVAS = 30;

		// Uma escala só, calculada da viewport, aplicada a todos: é o que faz o
		// mesmo conjunto caber num monitor e num celular sem rolagem.
		const escala = escalaParaCaber(itens.length, x1 - x0, y1Sorteio - y0);
		const lMin = CONFIG.larguraMin * escala;
		const lMax = CONFIG.larguraMax * escala;

		itens.forEach(function (item) {
			const l = Math.round(entre(lMin, lMax));
			item.style.width = l + "px";
			const alturaChute = l * CONFIG.alturaEstimada;

			const xMax = Math.max(x0, x1 - l);
			const yMax = Math.max(y0, y1Sorteio - alturaChute);

			let x = x0, y = y0, tentativa = 0, colide = true;
			while (colide && tentativa < TENTATIVAS) {
				x = entre(x0, xMax);
				y = entre(y0, yMax);
				colide =
					(zonaHeader &&
						sobrepoe(x, y, x + l, y + alturaChute,
							zonaHeader.x0, zonaHeader.y0, zonaHeader.x1, zonaHeader.y1)) ||
					colocados.some(function (o) {
						return sobrepoe(x, y, x + l, y + alturaChute, o.x0, o.y0, o.x1, o.y1);
					});
				tentativa++;
			}

			// Esgotou as tentativas ainda em cima do header: empurra pra baixo
			// dele, garantido — essa é a única colisão que não pode sobrar.
			if (zonaHeader &&
				sobrepoe(x, y, x + l, y + alturaChute,
					zonaHeader.x0, zonaHeader.y0, zonaHeader.x1, zonaHeader.y1)) {
				y = Math.min(Math.max(zonaHeader.y1 + CONFIG.margem, y0), yMax);
			}

			colocados.push({ x0: x, y0: y, x1: x + l, y1: y + alturaChute });

			item.style.left = Math.round(x) + "px";
			item.style.top = Math.round(y) + "px";
			item.style.transform =
				"rotate(" + entre(-CONFIG.giroMax, CONFIG.giroMax).toFixed(2) + "deg)";

			estados.push({
				item: item,
				x: x, y: y,
				visualX: x, visualY: y,
				vx: 0, vy: 0,
				alvoX: x, alvoY: y,
				l: l, a: alturaChute,
				arrastando: false,
			});
		});
	}

	// ---------------------------------------------------------------
	// Loop principal — colisão, inércia e perseguição visual
	// ---------------------------------------------------------------

	function empurrar(a, b) {
		const acx = a.x + a.l / 2;
		const acy = a.y + a.a / 2;
		const bcx = b.x + b.l / 2;
		const bcy = b.y + b.a / 2;
		let ang = Math.atan2(acy - bcy, acx - bcx);

		// Centros exatamente iguais: escolhe uma direção qualquer, senão o
		// atan2 devolve 0 e os dois ficam grudados empurrando pro mesmo lado.
		if (acx === bcx && acy === bcy) ang = aleatorio() * Math.PI * 2;

		let forca = COLISAO.forca;
		// Item bem maior empurra mais forte, pra compensar o viés de o pequeno
		// sempre ceder — mesma ideia do toybox original.
		if (b.l + b.a > (a.l + a.a) * 1.3) forca *= COLISAO.fatorGrande;

		a.x += Math.cos(ang) * forca;
		a.y += Math.sin(ang) * forca;
	}

	function passoGlobal() {
		const agora = performance.now();
		const colidindo = agora < colisoesAte;

		// As imagens vão carregando: remede antes de decidir sobreposição.
		estados.forEach(function (e) {
			e.l = e.item.offsetWidth || e.l;
			e.a = e.item.offsetHeight || e.a;
		});

		if (colidindo) {
			for (let i = 0; i < estados.length; i++) {
				const A = estados[i];
				if (A.arrastando) continue;
				for (let k = 0; k < estados.length; k++) {
					if (i === k) continue;
					const B = estados[k];
					if (B.arrastando) continue;
					if (!sobrepoe(A.x, A.y, A.x + A.l, A.y + A.a,
						B.x, B.y, B.x + B.l, B.y + B.a)) continue;
					empurrar(A, B);
				}
			}
		}

		let seguir = colidindo;

		estados.forEach(function (e) {
			if (e.arrastando) {
				// Perseguição com atraso: é isso que dá peso ao arraste.
				e.x += (e.alvoX - e.x) * FISICA.arrasto;
				e.y += (e.alvoY - e.y) * FISICA.arrasto;
				seguir = true;
			} else if (Math.abs(e.vx) + Math.abs(e.vy) >= FISICA.velocidadeMin) {
				e.x += e.vx;
				e.y += e.vy;
				e.vx *= FISICA.atrito;
				e.vy *= FISICA.atrito;
				seguir = true;
			} else {
				e.vx = 0;
				e.vy = 0;
			}

			// Mola de retorno. Não roda durante o arraste — lá o item segue a
			// mão pra onde ela for, inclusive pra fora da tela. Ao soltar, esta
			// parte puxa a posição física de volta pra dentro da viewport; como
			// o visual persegue a física com atraso, a volta sai deslizando, no
			// mesmo espírito da animação de surgimento.
			if (!e.arrastando) {
				const xMax = Math.max(limites.x0, limites.x1 - e.l);
				const yMax = Math.max(limites.y0, limites.y1 - e.a);

				if (e.x < limites.x0) {
					e.x += (limites.x0 - e.x) * RETORNO.mola;
					e.vx *= RETORNO.freio;
					seguir = true;
				} else if (e.x > xMax) {
					e.x += (xMax - e.x) * RETORNO.mola;
					e.vx *= RETORNO.freio;
					seguir = true;
				}

				if (e.y < limites.y0) {
					e.y += (limites.y0 - e.y) * RETORNO.mola;
					e.vy *= RETORNO.freio;
					seguir = true;
				} else if (e.y > yMax) {
					e.y += (yMax - e.y) * RETORNO.mola;
					e.vy *= RETORNO.freio;
					seguir = true;
				}
			}

			const anteriorX = e.visualX;
			const anteriorY = e.visualY;
			e.visualX += (e.x - e.visualX) * FISICA.suavizacao;
			e.visualY += (e.y - e.visualY) * FISICA.suavizacao;

			// Enquanto arrasta, a velocidade vem do próprio rastro visual — é
			// ela que vira o impulso da freada ao soltar.
			if (e.arrastando) {
				e.vx = e.visualX - anteriorX;
				e.vy = e.visualY - anteriorY;
			}

			if (Math.abs(e.x - e.visualX) + Math.abs(e.y - e.visualY) > 0.1) seguir = true;

			e.item.style.left = e.visualX + "px";
			e.item.style.top = e.visualY + "px";
		});

		loop = seguir ? requestAnimationFrame(passoGlobal) : null;
	}

	function acordarLoop() {
		if (!loop) loop = requestAnimationFrame(passoGlobal);
	}

	// Ao redimensionar, a área é retravada na nova viewport e os limites da
	// mola acompanham — quem tiver ficado pra fora volta deslizando sozinho.
	let esperaResize = null;
	window.addEventListener("resize", function () {
		clearTimeout(esperaResize);
		esperaResize = setTimeout(function () {
			if (!estados.length) return;
			const deslocamentoTopo = ajustarAlturaDaViewport();
			limites.x0 = CONFIG.margem;
			limites.x1 = area.clientWidth - CONFIG.margem;
			limites.y0 = -deslocamentoTopo + CONFIG.topoLivre;
			limites.y1 = area.clientHeight - CONFIG.rodapeLivre;
			acordarLoop();
		}, 150);
	});

	// ---------------------------------------------------------------

	// Revela os itens um a um, em ordem embaralhada (Fisher-Yates, como o
	// toybox.js original faz com os nós antes de exibi-los — "pra evitar viés"
	// de sempre o mesmo item aparecer primeiro). Cada item ganha seu próprio
	// transition-delay; a classe "surgiu" é adicionada a todos no frame
	// seguinte, e o CSS cuida do resto.
	function revelarEmSequencia(itens) {
		const ordem = itens.map(function (_, i) { return i; });
		for (let i = ordem.length - 1; i > 0; i--) {
			const j = Math.floor(aleatorio() * (i + 1));
			const t = ordem[i];
			ordem[i] = ordem[j];
			ordem[j] = t;
		}

		const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		ordem.forEach(function (indiceItem, posicao) {
			const item = itens[indiceItem];
			if (semMovimento) {
				item.style.transitionDelay = "0s";
			} else {
				const atraso = posicao * CONFIG.atrasoEntrada + "ms";
				item.style.transitionDelay = atraso;
				const pop = item.querySelector(".wishlist-item-pop");
				if (pop) pop.style.transitionDelay = atraso;
			}
		});

		requestAnimationFrame(function () {
			itens.forEach(function (item) {
				item.classList.add("surgiu");
			});
		});

		// A colisão acompanha o surgimento e sobra um pouco depois do último
		// item aparecer — assim eles se acomodam conforme vão entrando, e não
		// num solavanco só no fim.
		if (!semMovimento) {
			colisoesAte =
				performance.now() +
				itens.length * CONFIG.atrasoEntrada +
				COLISAO.folgaFinal;
			acordarLoop();
		}
	}

	// Arrastar com pointer events: cobre mouse e toque com um caminho só.
	function permitirArraste(estado) {
		const item = estado.item;
		let iniX = 0, iniY = 0, baseX = 0, baseY = 0, moveu = false;

		item.addEventListener("pointerdown", function (e) {
			if (e.button !== undefined && e.button !== 0) return;
			// Impede seleção de texto e o drag nativo que ainda escapa em
			// alguns navegadores.
			e.preventDefault();
			estado.arrastando = true;
			moveu = false;
			iniX = e.clientX;
			iniY = e.clientY;
			baseX = estado.x;
			baseY = estado.y;
			estado.alvoX = estado.x;
			estado.alvoY = estado.y;
			estado.vx = 0;
			estado.vy = 0;
			item.classList.add("arrastando");
			item.setPointerCapture(e.pointerId);
			acordarLoop();
		});

		item.addEventListener("pointermove", function (e) {
			if (!estado.arrastando) return;
			const dx = e.clientX - iniX;
			const dy = e.clientY - iniY;
			// Só conta como arrasto depois de alguns pixels, senão um clique
			// trêmulo cancelaria a abertura do link.
			if (!moveu && Math.abs(dx) + Math.abs(dy) > 4) moveu = true;
			if (!moveu) return;

			estado.alvoX = baseX + dx;
			estado.alvoY = baseY + dy;
		});

		function soltar(e) {
			if (!estado.arrastando) return;
			estado.arrastando = false;
			item.classList.remove("arrastando");
			if (item.hasPointerCapture && item.hasPointerCapture(e.pointerId)) {
				item.releasePointerCapture(e.pointerId);
			}
			const v = Math.hypot(estado.vx, estado.vy);
			if (v > FISICA.velocidadeMax) {
				estado.vx = (estado.vx / v) * FISICA.velocidadeMax;
				estado.vy = (estado.vy / v) * FISICA.velocidadeMax;
			}
			acordarLoop();
		}
		item.addEventListener("dragstart", function (e) {
			e.preventDefault();
		});
		item.addEventListener("pointerup", soltar);
		item.addEventListener("pointercancel", soltar);

		// Se houve arrasto, engole o clique pra não abrir o link sem querer.
		item.addEventListener("click", function (e) {
			if (moveu) {
				e.preventDefault();
				e.stopPropagation();
			}
		}, true);
	}

	fetch("/assets/json/wishlist.json", { cache: "no-cache" })
		.then(function (r) {
			if (!r.ok) throw new Error("falha ao carregar wishlist.json");
			return r.json();
		})
		.then(function (dados) {
			if (carregando) carregando.remove();
			if (!Array.isArray(dados) || !dados.length) {
				area.insertAdjacentHTML("beforeend", "<p>Nada na lista por enquanto.</p>");
				return;
			}

			const itens = dados.map(montarItem);
			itens.forEach(function (i) {
				area.appendChild(i);
			});

			// Espalha depois de um frame, com o #wishlist já medido.
			requestAnimationFrame(function () {
				espalhar(itens);
				estados.forEach(permitirArraste);
				revelarEmSequencia(itens);
			});
		})
		.catch(function (e) {
			console.error("wishlist:", e);
			if (carregando) carregando.textContent = "Erro ao carregar a lista.";
		});

	// O dot field é o fundo desta página.
	if (window.iniciarDotField) window.iniciarDotField();
})();
