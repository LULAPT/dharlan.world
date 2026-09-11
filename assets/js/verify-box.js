// verify-box.js — as duas peças de JS da caixa de verificação (a .verify-box
// do boot-terminal.css): o Ray ID falso do rodapé e o brilho de borda que
// segue o cursor.
//
// Nasceram dentro do boot-terminal.js, mas a /curriculo/ usa a mesma caixa
// como portão de senha — então vieram pra cá em vez de virar cópia. Script
// clássico com globais em vez de módulo ES, porque quem carrega isso
// (boot-terminal.js, curriculo.js) também é <script src> comum.

(function () {
	// Ray ID falso: 16 dígitos hex, como os da Cloudflare na tela de desafio.
	// Fica guardado no sessionStorage pra ser o mesmo durante toda a sessão,
	// como seria um Ray ID real.
	window.definirRayId = function (alvo) {
		if (!alvo) return;

		let id = null;
		try {
			id = sessionStorage.getItem("bootRayId");
		} catch (e) {
			// modo privado/cookies bloqueados: só gera sem guardar
		}

		// Descarta valor guardado fora do formato atual (sessões antigas).
		if (id && !/^[0-9a-f]{16}$/.test(id)) id = null;

		if (!id) {
			const bytes = new Uint8Array(8);
			if (window.crypto && window.crypto.getRandomValues) {
				window.crypto.getRandomValues(bytes);
			} else {
				for (let i = 0; i < bytes.length; i++) {
					bytes[i] = Math.floor(Math.random() * 256);
				}
			}
			id = Array.from(bytes)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			try {
				sessionStorage.setItem("bootRayId", id);
			} catch (e) {
				/* idem */
			}
		}

		alvo.textContent = id;
	};

	// Brilho de borda seguindo o cursor. Só alimenta duas custom properties;
	// todo o desenho está no .verify-box do boot-terminal.css.
	window.ativarBorderGlow = function (caixa) {
		if (!caixa || !window.matchMedia("(pointer: fine)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		// Alvo = onde o cursor está agora; atual = valor desenhado. A cada frame
		// o atual persegue o alvo, que é o que deixa o movimento macio em vez de
		// grudado no ponteiro.
		let anguloAlvo = 45;
		let proximidadeAlvo = 0;
		let angulo = 45;
		let proximidade = 0;
		let frame = null;
		let parado = true;

		function medir(e) {
			const r = caixa.getBoundingClientRect();
			const cx = r.width / 2;
			const cy = r.height / 2;
			const dx = e.clientX - r.left - cx;
			const dy = e.clientY - r.top - cy;

			// Quanto o cursor avançou do centro rumo à borda, em 0..1: 1 é
			// exatamente em cima da borda.
			const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
			const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
			proximidadeAlvo = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1) * 100;

			let g = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
			anguloAlvo = (g + 360) % 360;
			iniciar();
		}

		function passo() {
			// Interpola pelo caminho curto do círculo, senão vira o ângulo todo
			// ao cruzar de 359° pra 1°.
			const delta = (((anguloAlvo - angulo + 540) % 360) - 180) * 0.18;
			angulo = (angulo + delta + 360) % 360;
			proximidade += (proximidadeAlvo - proximidade) * 0.14;

			caixa.style.setProperty("--cursor-angle", angulo.toFixed(2) + "deg");
			caixa.style.setProperty("--edge-proximity", proximidade.toFixed(2));

			// Assentou no alvo: desliga o loop até o cursor mexer de novo.
			if (Math.abs(proximidadeAlvo - proximidade) < 0.1 && Math.abs(delta) < 0.05) {
				proximidade = proximidadeAlvo;
				caixa.style.setProperty("--edge-proximity", proximidade.toFixed(2));
				frame = null;
				parado = true;
				return;
			}
			frame = requestAnimationFrame(passo);
		}

		function iniciar() {
			if (parado) {
				parado = false;
				frame = requestAnimationFrame(passo);
			}
		}

		function afastar() {
			proximidadeAlvo = 0;
			iniciar();
		}

		// Só na caixa: escutar na janela inteira fazia a proximidade saturar em
		// 100 sempre que o cursor estivesse fora dela (que é quase sempre), e o
		// brilho ficava aceso o tempo todo. O fade de saída fica com o CSS, na
		// regra :not(:hover).
		caixa.addEventListener("pointermove", medir, { passive: true });
		caixa.addEventListener("pointerleave", afastar);

		// Devolve um jeito de desligar tudo: a caixa some do DOM depois da
		// verificação, e um requestAnimationFrame órfão rodando pra sempre atrás
		// da página seria desperdício.
		return function desligar() {
			caixa.removeEventListener("pointermove", medir);
			caixa.removeEventListener("pointerleave", afastar);
			if (frame) cancelAnimationFrame(frame);
		};
	};
})();
