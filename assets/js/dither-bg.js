// dither-bg.js — fundo de ondas com dithering de Bayer, em WebGL2 puro.
//
// Portado do componente Dither do reactbits.dev, que usa three.js +
// @react-three/fiber + postprocessing. Nada disso veio junto: o que importa ali
// são dois shaders GLSL (o ruído fbm das ondas e a matriz de Bayer 8x8), e
// ambos rodam num quad de tela cheia sem biblioteca nenhuma.
//
// O original precisa de EffectComposer porque no three.js a onda é um mesh e o
// dither é um passe de pós-processamento. Aqui os dois estão fundidos num único
// fragment shader, então não há framebuffer intermediário — menos memória de
// vídeo e um passe a menos por frame.
//
// As cores saem das custom properties do tema, então o fundo acompanha
// dark/light/steam-green sozinho.

(function () {
	// ---------------------------------------------------------------
	// Ajustes — é aqui que se calibra o visual
	// ---------------------------------------------------------------
	const CONFIG = {
		velocidade: 0.04, // quão rápido as ondas andam
		frequencia: 3.0, // quantidade de detalhe (oitavas mais apertadas)
		amplitude: 0.3, // contraste entre cristas e vales
		intensidadeCor: 0.55, // 0 = fundo puro, 1 = cor do tema no talo
		numCores: 4, // níveis de quantização (menos = mais "retrô")
		tamanhoPixel: 3, // lado do pixelão, em px de tela
		raioMouse: 0.22, // alcance do empurrão do cursor
		// Anda junto com o raio: força perto do valor do raio deforma demais e
		// vira um borrão duro. Manter em torno de 1/4 dele mantém o empurrão
		// com cara de fumaça em qualquer tamanho.
		forcaMouse: 0.055, // quanto a fumaça é afastada (0 = desliga o empurrão)
		inerciaMouse: 0.07, // 0..1 — menor = fumaça acompanha com mais preguiça
		interacaoMouse: true,
	};

	const VERT = `#version 300 es
	in vec2 posicao;
	void main() { gl_Position = vec4(posicao, 0.0, 1.0); }
	`;

	// Um passe só: gera a onda, aplica o dither e quantiza.
	const FRAG = `#version 300 es
	precision highp float;
	precision highp int;

	uniform vec2 uResolucao;
	uniform float uTempo;
	uniform float uVelocidade;
	uniform float uFrequencia;
	uniform float uAmplitude;
	uniform vec3 uCorOnda;
	uniform vec3 uCorFundo;
	uniform vec2 uMouse;
	uniform float uRaioMouse;
	uniform float uForcaMouse;
	uniform float uUsaMouse;
	uniform float uNumCores;
	uniform float uTamanhoPixel;

	out vec4 corSaida;

	vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
	vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
	vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

	// Perlin clássico 2D
	float cnoise(vec2 P) {
		vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
		vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
		Pi = mod289(Pi);
		vec4 ix = Pi.xzxz;
		vec4 iy = Pi.yyww;
		vec4 fx = Pf.xzxz;
		vec4 fy = Pf.yyww;
		vec4 i = permute(permute(ix) + iy);
		vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
		vec4 gy = abs(gx) - 0.5;
		vec4 tx = floor(gx + 0.5);
		gx = gx - tx;
		vec2 g00 = vec2(gx.x, gy.x);
		vec2 g10 = vec2(gx.y, gy.y);
		vec2 g01 = vec2(gx.z, gy.z);
		vec2 g11 = vec2(gx.w, gy.w);
		vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
		g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
		float n00 = dot(g00, vec2(fx.x, fy.x));
		float n10 = dot(g10, vec2(fx.y, fy.y));
		float n01 = dot(g01, vec2(fx.z, fy.z));
		float n11 = dot(g11, vec2(fx.w, fy.w));
		vec2 fade_xy = fade(Pf.xy);
		vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
		return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
	}

	float fbm(vec2 p) {
		float valor = 0.0;
		float amp = 1.0;
		float freq = uFrequencia;
		for (int i = 0; i < 4; i++) {
			valor += amp * abs(cnoise(p));
			p *= freq;
			amp *= uAmplitude;
		}
		return valor;
	}

	float padrao(vec2 p) {
		vec2 p2 = p - uTempo * uVelocidade;
		return fbm(p + fbm(p2));
	}

	const float bayer[64] = float[64](
		 0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
		32.0/64.0, 16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
		 8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0,  7.0/64.0, 55.0/64.0,
		40.0/64.0, 24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
		 2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
		34.0/64.0, 18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
		10.0/64.0, 58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0, 57.0/64.0,  5.0/64.0, 53.0/64.0,
		42.0/64.0, 26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
	);

	void main() {
		// Amostra no centro do "pixelão" — é o que dá o degrau grosso, sem
		// precisar renderizar num buffer menor e reescalar.
		vec2 blocoXY = floor(gl_FragCoord.xy / uTamanhoPixel);
		vec2 fragBloco = blocoXY * uTamanhoPixel + uTamanhoPixel * 0.5;

		vec2 uv = fragBloco / uResolucao;
		uv -= 0.5;
		uv.x *= uResolucao.x / uResolucao.y;

		// Empurrão do cursor: em vez de escurecer um círculo (o que é só uma
		// mancha), desloca a coordenada de amostragem na direção do cursor.
		// Amostrar mais perto dele faz o desenho parecer afastado — a fumaça
		// abre espaço em volta do ponteiro.
		if (uUsaMouse > 0.5) {
			vec2 mouseNDC = (uMouse / uResolucao - 0.5) * vec2(1.0, -1.0);
			mouseNDC.x *= uResolucao.x / uResolucao.y;
			vec2 desloc = uv - mouseNDC;
			float dist = length(desloc);
			if (dist > 0.0001) {
				float queda = 1.0 - smoothstep(0.0, uRaioMouse, dist);
				// Sobe do centro pra fora: sem isso o deslocamento é máximo
				// exatamente sobre o cursor e vira um beliscão feio no meio.
				float miolo = smoothstep(0.0, uRaioMouse * 0.35, dist);
				uv -= (desloc / dist) * queda * miolo * uForcaMouse;
			}
		}

		float f = padrao(uv);

		vec3 cor = mix(uCorFundo, uCorOnda, clamp(f, 0.0, 1.0));

		// Dither de Bayer + quantização
		int bx = int(mod(blocoXY.x, 8.0));
		int by = int(mod(blocoXY.y, 8.0));
		float limiar = bayer[by * 8 + bx] - 0.25;
		float degrau = 1.0 / (uNumCores - 1.0);
		cor += limiar * degrau;

		float luminancia = dot(cor, vec3(0.2126, 0.7152, 0.0722));
		float vies = mix(0.2, 0.0, smoothstep(0.45, 0.8, luminancia));
		cor = clamp(cor - vies, 0.0, 1.0);
		cor = floor(cor * (uNumCores - 1.0) + 0.5) / (uNumCores - 1.0);

		corSaida = vec4(cor, 1.0);
	}
	`;

	// Resolve qualquer cor CSS (inclusive as lch() do variaveis.css) pintando
	// num canvas 2D de 1x1 e lendo o pixel de volta — o navegador faz a
	// conversão por nós, sem precisar interpretar lch na mão.
	const cvCor = document.createElement("canvas");
	cvCor.width = cvCor.height = 1;
	const ctxCor = cvCor.getContext("2d", { willReadFrequently: true });

	function corParaRgb(valorCss, reserva) {
		try {
			ctxCor.clearRect(0, 0, 1, 1);
			ctxCor.fillStyle = "#000";
			ctxCor.fillStyle = valorCss;
			ctxCor.fillRect(0, 0, 1, 1);
			const d = ctxCor.getImageData(0, 0, 1, 1).data;
			return [d[0] / 255, d[1] / 255, d[2] / 255];
		} catch (e) {
			return reserva;
		}
	}

	function lerCoresDoTema() {
		const cs = getComputedStyle(document.documentElement);
		const onda = corParaRgb(cs.getPropertyValue("--clr-main-a30").trim(), [
			0.5, 0.5, 0.5,
		]);
		const fundo = corParaRgb(cs.getPropertyValue("--clr-black-a0").trim(), [
			0, 0, 0,
		]);
		// intensidadeCor puxa a onda de volta na direção do fundo, pra ela não
		// gritar mais que a caixa de verificação.
		const onda2 = onda.map((c, i) =>
			fundo[i] + (c - fundo[i]) * CONFIG.intensidadeCor
		);
		return { onda: onda2, fundo: fundo };
	}

	function compilar(gl, tipo, fonte) {
		const sh = gl.createShader(tipo);
		gl.shaderSource(sh, fonte.trim());
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			console.error("dither-bg: shader falhou —", gl.getShaderInfoLog(sh));
			gl.deleteShader(sh);
			return null;
		}
		return sh;
	}

	// Monta o fundo dentro de `container`. Devolve uma função pra desligar, ou
	// null se o navegador não der conta (aí a tela fica com o fundo liso de
	// sempre — nada quebra).
	window.iniciarDitherBg = function (container) {
		if (!container) return null;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return null;
		}

		const canvas = document.createElement("canvas");
		canvas.className = "dither-bg";
		const gl = canvas.getContext("webgl2", {
			antialias: false,
			alpha: false,
			depth: false,
			stencil: false,
			powerPreference: "low-power",
		});
		if (!gl) return null; // sem WebGL2: desiste em silêncio

		const vs = compilar(gl, gl.VERTEX_SHADER, VERT);
		const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG);
		if (!vs || !fs) return null;

		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			console.error("dither-bg: link falhou —", gl.getProgramInfoLog(prog));
			return null;
		}
		gl.useProgram(prog);

		// Quad de tela cheia (dois triângulos)
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 3, -1, -1, 3]),
			gl.STATIC_DRAW
		);
		const loc = gl.getAttribLocation(prog, "posicao");
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

		const u = {};
		[
			"uResolucao", "uTempo", "uVelocidade", "uFrequencia", "uAmplitude",
			"uCorOnda", "uCorFundo", "uMouse", "uRaioMouse", "uForcaMouse", "uUsaMouse",
			"uNumCores", "uTamanhoPixel",
		].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));

		gl.uniform1f(u.uVelocidade, CONFIG.velocidade);
		gl.uniform1f(u.uFrequencia, CONFIG.frequencia);
		gl.uniform1f(u.uAmplitude, CONFIG.amplitude);
		gl.uniform1f(u.uNumCores, CONFIG.numCores);
		gl.uniform1f(u.uTamanhoPixel, CONFIG.tamanhoPixel);
		gl.uniform1f(u.uRaioMouse, CONFIG.raioMouse);
		gl.uniform1f(u.uForcaMouse, CONFIG.forcaMouse);
		gl.uniform1f(u.uUsaMouse, CONFIG.interacaoMouse ? 1 : 0);

		function aplicarCores() {
			const { onda, fundo } = lerCoresDoTema();
			gl.uniform3f(u.uCorOnda, onda[0], onda[1], onda[2]);
			gl.uniform3f(u.uCorFundo, fundo[0], fundo[1], fundo[2]);
		}
		aplicarCores();

		// DPR fixo em 1 de propósito: o efeito já é pixelado, renderizar em 2x
		// só custaria GPU pra depois jogar o detalhe fora no dither.
		function redimensionar() {
			const l = Math.max(1, Math.floor(container.clientWidth));
			const a = Math.max(1, Math.floor(container.clientHeight));
			if (canvas.width !== l || canvas.height !== a) {
				canvas.width = l;
				canvas.height = a;
				gl.viewport(0, 0, l, a);
				gl.uniform2f(u.uResolucao, l, a);
			}
		}

		// O cursor real é o alvo; o que vai pro shader persegue esse alvo devagar.
		// É essa defasagem que dá a sensação de fumaça sendo deslocada, em vez de
		// um buraco grudado no ponteiro.
		const alvoMouse = { x: -9999, y: -9999 };
		const mouse = { x: -9999, y: -9999 };
		let primeiroToque = true;

		function moverMouse(e) {
			const r = canvas.getBoundingClientRect();
			alvoMouse.x = e.clientX - r.left;
			alvoMouse.y = e.clientY - r.top;
			// Começa fora da tela: sem este salto, o primeiro movimento arrastaria
			// um rastro vindo do canto.
			if (primeiroToque) {
				mouse.x = alvoMouse.x;
				mouse.y = alvoMouse.y;
				primeiroToque = false;
			}
		}
		if (CONFIG.interacaoMouse) {
			window.addEventListener("pointermove", moverMouse, { passive: true });
		}

		// O tema pode mudar com a tela aberta (a engrenagem fica por cima dela).
		const observador = new MutationObserver(aplicarCores);
		observador.observe(document.documentElement, {
			attributeFilter: ["data-theme"],
		});

		const t0 = performance.now();
		let frame = null;
		let vivo = true;

		function desenhar() {
			if (!vivo) return;
			redimensionar();
			gl.uniform1f(u.uTempo, (performance.now() - t0) / 1000);
			mouse.x += (alvoMouse.x - mouse.x) * CONFIG.inerciaMouse;
			mouse.y += (alvoMouse.y - mouse.y) * CONFIG.inerciaMouse;
			gl.uniform2f(u.uMouse, mouse.x, mouse.y);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			frame = requestAnimationFrame(desenhar);
		}

		container.insertBefore(canvas, container.firstChild);
		redimensionar();
		frame = requestAnimationFrame(desenhar);

		return function desligar() {
			vivo = false;
			if (frame) cancelAnimationFrame(frame);
			observador.disconnect();
			window.removeEventListener("pointermove", moverMouse);
			// Libera a memória de vídeo na hora, sem esperar o coletor.
			const perder = gl.getExtension("WEBGL_lose_context");
			if (perder) perder.loseContext();
			canvas.remove();
		};
	};
})();
