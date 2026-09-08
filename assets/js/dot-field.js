// dot-field.js — malha de pontos que se abaulam pra longe do cursor.
//
// Portado do DotField do reactbits.dev. O original é React + canvas 2D + um
// <svg> à parte só pro brilho radial que segue o mouse; aqui é canvas puro, e o
// brilho virou um radial-gradient desenhado no mesmo contexto — um elemento a
// menos e nenhuma dependência.
//
// Fica fixo na viewport (como o fundo do /inventario/), então passa por trás do
// header e do footer. As cores saem das variáveis do tema.

(function () {
	const DOIS_PI = Math.PI * 2;

	const CONFIG = {
		raioPonto: 1.5, // raio de cada ponto
		espacamento: 14, // folga entre pontos
		raioCursor: 260, // até onde o abaulamento alcança
		forcaBojo: 46, // quanto os pontos fogem do cursor
		raioBrilho: 170, // tamanho do halo que segue o mouse
		opacidadePontos: 0.42, // transparência da malha
		opacidadeBrilho: 0.16, // intensidade do halo
	};

	// Resolve cores CSS (inclusive lch()) lendo de volta um pixel pintado.
	const cvCor = document.createElement("canvas");
	cvCor.width = cvCor.height = 1;
	const ctxCor = cvCor.getContext("2d", { willReadFrequently: true });

	function resolverCor(valorCss, reserva) {
		try {
			ctxCor.clearRect(0, 0, 1, 1);
			ctxCor.fillStyle = "#000";
			ctxCor.fillStyle = valorCss;
			ctxCor.fillRect(0, 0, 1, 1);
			const d = ctxCor.getImageData(0, 0, 1, 1).data;
			return [d[0], d[1], d[2]];
		} catch (e) {
			return reserva;
		}
	}

	function corDoTema(nomeVar, reserva) {
		const v = getComputedStyle(document.documentElement)
			.getPropertyValue(nomeVar)
			.trim();
		return resolverCor(v, reserva);
	}

	window.iniciarDotField = function () {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

		const canvas = document.createElement("canvas");
		canvas.id = "dot-field";
		const ctx = canvas.getContext("2d", { alpha: true });
		if (!ctx) return null;
		document.body.appendChild(canvas);

		// Teto de 2 no devicePixelRatio: acima disso o custo cresce sem ganho
		// visível numa malha de pontinhos.
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		let largura = 0;
		let altura = 0;
		let pontos = [];
		let corPonto = [255, 255, 255];
		let corBrilho = [255, 255, 255];

		function lerCores() {
			corPonto = corDoTema("--clr-gray-a40", [120, 120, 120]);
			corBrilho = corDoTema("--clr-main-a30", [212, 92, 149]);
		}

		function montarPontos() {
			const passo = CONFIG.raioPonto + CONFIG.espacamento;
			const colunas = Math.floor(largura / passo);
			const linhas = Math.floor(altura / passo);
			const folgaX = ((largura % passo) + passo) / 2;
			const folgaY = ((altura % passo) + passo) / 2;
			pontos = new Array(Math.max(0, colunas * linhas));
			let i = 0;
			for (let l = 0; l < linhas; l++) {
				for (let c = 0; c < colunas; c++) {
					const ax = folgaX + c * passo;
					const ay = folgaY + l * passo;
					// ax/ay = casa de origem; sx/sy = onde o ponto está agora.
					pontos[i++] = { ax: ax, ay: ay, sx: ax, sy: ay };
				}
			}
		}

		let temporizador = null;
		function redimensionar() {
			clearTimeout(temporizador);
			temporizador = setTimeout(function () {
				largura = window.innerWidth;
				altura = window.innerHeight;
				canvas.width = Math.floor(largura * dpr);
				canvas.height = Math.floor(altura * dpr);
				canvas.style.width = largura + "px";
				canvas.style.height = altura + "px";
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				montarPontos();
			}, 100);
		}

		// Posição do cursor em coordenadas de viewport: o canvas é fixed, então
		// clientX/clientY servem direto, sem descontar scroll.
		const cursor = { x: -9999, y: -9999, ax: -9999, ay: -9999, velocidade: 0 };

		function moverCursor(e) {
			cursor.x = e.clientX;
			cursor.y = e.clientY;
		}

		// A "energia" mede o quanto o mouse está se mexendo. Parado, a malha
		// volta ao repouso e o halo some — é o que dá a sensação de reagir ao
		// movimento, e não só à posição.
		let energia = 0;
		let brilho = 0;

		function medirVelocidade() {
			const dx = cursor.ax - cursor.x;
			const dy = cursor.ay - cursor.y;
			const d = Math.sqrt(dx * dx + dy * dy);
			cursor.velocidade += (d - cursor.velocidade) * 0.5;
			if (cursor.velocidade < 0.001) cursor.velocidade = 0;
			cursor.ax = cursor.x;
			cursor.ay = cursor.y;
		}
		const intervalo = setInterval(medirVelocidade, 20);

		let frame = null;
		let vivo = true;

		function desenhar() {
			if (!vivo) return;

			const alvo = Math.min(cursor.velocidade / 5, 1);
			energia += (alvo - energia) * 0.06;
			if (energia < 0.001) energia = 0;
			brilho += (energia - brilho) * 0.08;

			ctx.clearRect(0, 0, largura, altura);

			// Halo sob o cursor. No original isso era um <svg> separado só pra
			// este círculo; aqui é um gradiente no mesmo canvas.
			if (brilho > 0.01) {
				const g = ctx.createRadialGradient(
					cursor.x, cursor.y, 0,
					cursor.x, cursor.y, CONFIG.raioBrilho
				);
				const c = corBrilho;
				g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," +
					(brilho * CONFIG.opacidadeBrilho) + ")");
				g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, largura, altura);
			}

			const raio = CONFIG.raioPonto / 2;
			const rc = CONFIG.raioCursor;
			const rcQuad = rc * rc;

			// Um Path2D só pra malha inteira: 1 fill por frame em vez de milhares.
			ctx.beginPath();
			for (let i = 0; i < pontos.length; i++) {
				const p = pontos[i];
				const dx = cursor.x - p.ax;
				const dy = cursor.y - p.ay;
				const distQuad = dx * dx + dy * dy;

				if (distQuad < rcQuad && energia > 0.01) {
					const dist = Math.sqrt(distQuad);
					const t = 1 - dist / rc;
					const empurrao = t * t * CONFIG.forcaBojo * energia;
					const ang = Math.atan2(dy, dx);
					p.sx += (p.ax - Math.cos(ang) * empurrao - p.sx) * 0.15;
					p.sy += (p.ay - Math.sin(ang) * empurrao - p.sy) * 0.15;
				} else {
					p.sx += (p.ax - p.sx) * 0.1;
					p.sy += (p.ay - p.sy) * 0.1;
				}

				ctx.moveTo(p.sx + raio, p.sy);
				ctx.arc(p.sx, p.sy, raio, 0, DOIS_PI);
			}
			const cp = corPonto;
			ctx.fillStyle = "rgba(" + cp[0] + "," + cp[1] + "," + cp[2] + "," +
				CONFIG.opacidadePontos + ")";
			ctx.fill();

			frame = requestAnimationFrame(desenhar);
		}

		lerCores();
		largura = window.innerWidth;
		altura = window.innerHeight;
		canvas.width = Math.floor(largura * dpr);
		canvas.height = Math.floor(altura * dpr);
		canvas.style.width = largura + "px";
		canvas.style.height = altura + "px";
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		montarPontos();

		window.addEventListener("resize", redimensionar);
		window.addEventListener("mousemove", moverCursor, { passive: true });
		const observador = new MutationObserver(lerCores);
		observador.observe(document.documentElement, {
			attributeFilter: ["data-theme"],
		});

		frame = requestAnimationFrame(desenhar);

		return function desligar() {
			vivo = false;
			if (frame) cancelAnimationFrame(frame);
			clearInterval(intervalo);
			clearTimeout(temporizador);
			window.removeEventListener("resize", redimensionar);
			window.removeEventListener("mousemove", moverCursor);
			observador.disconnect();
			canvas.remove();
		};
	};
})();
