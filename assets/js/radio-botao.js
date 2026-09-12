// radio-botao.js — o botão fixo que leva pra /radio/.
//
// Mesmo desenho da engrenagem de configurações (settings-panel.js): quadrado de
// 40px, fundo preto, borda e ícone na cor do tema. Fica colado nela, no canto
// inferior esquerdo — o mini player do rádio mora no canto direito, então os
// dois não disputam espaço.
//
// Fica fora da navbar de propósito: é atalho, não item de menu. Por isso também
// não entra no `links` do navbar.js nem no sitemap-data.js.
//
// O CSS mora aqui dentro em vez de em assets/css/ pela mesma razão do navbar.js
// e do footer.js: o elemento não existe em nenhum HTML, é este arquivo que o
// cria — deixar os dois juntos evita CSS órfão apontando pra nada.

const CSS = `
	#radio-botao {
		align-items: center;
		background: var(--clr-black-a0);
		border: var(--borda-padrao);
		border-radius: var(--b-radius);
		bottom: 20px;
		color: var(--clr-main-a40);
		cursor: pointer;
		display: flex;
		height: 40px;
		justify-content: center;
		/* A engrenagem ocupa de 20px a 60px; 70px deixa 10px de respiro. */
		left: 70px;
		position: fixed;
		text-decoration: none;
		width: 40px;
		/* Mesma camada da engrenagem: acima de tudo, inclusive do portão da
		   /curriculo/ (900) e do boot da /index/ (900). */
		z-index: 997;
	}

	/* Sem mudança de cor no hover: a borda fica na cor padrão em qualquer
	   estado, e quem responde ao cursor é só a animação do ícone abaixo. */

	#radio-botao svg {
		display: block;
		height: 24px;
		transition: transform 0.3s;
		width: 24px;
	}

	/* A engrenagem gira no hover; aqui as ondas "pulsam". Mesma ideia, mesma
	   duração, gesto diferente. */
	#radio-botao:hover svg {
		transform: scale(1.12);
	}

	#radio-botao .ponto {
		transition: transform 0.3s;
		transform-origin: 12px 12px;
	}

	#radio-botao:hover .ponto {
		transform: scale(1.3);
	}

	/* Enquanto o boot da /index/ está na tela o botão continua aparecendo (é
	   parte do cenário, junto da engrenagem), mas não leva a lugar nenhum: o
	   clique só devolve o som e a balançada de "não". */
	#radio-botao.negado {
		animation: radio-botao-nega 0.4s ease-in-out;
	}

	/* Amplitude pequena de propósito: é um "não" de cabeça, não um tremor de
	   erro. */
	@keyframes radio-botao-nega {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-3px);
		}
		45% {
			transform: translateX(3px);
		}
		70% {
			transform: translateX(-2px);
		}
		88% {
			transform: translateX(1px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		#radio-botao svg,
		#radio-botao .ponto {
			transition: none;
		}

		#radio-botao:hover svg,
		#radio-botao:hover .ponto {
			transform: none;
		}

		#radio-botao.negado {
			animation: none;
		}
	}
`;

// Ondas de transmissão saindo de um ponto. Traçado em vez de preenchido porque
// os arcos ficam limpos assim; o ponto do meio é o único preenchido.
const ICONE = `
	<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
		stroke="currentColor" stroke-width="2" stroke-linecap="round">
		<circle class="ponto" cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
		<path d="M8.5 8.5a5 5 0 0 0 0 7" />
		<path d="M15.5 8.5a5 5 0 0 1 0 7" />
		<path d="M5.6 5.6a9 9 0 0 0 0 12.8" />
		<path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
	</svg>
`;

function estaNaPaginaDoRadio() {
	return /^\/radio\/?$/.test(location.pathname);
}

// O boot da /index/ (verificação "sou humano" + animação de BIOS) segura a
// entrada no site, e o botão do rádio não pode virar um atalho que fura essa
// fila. Enquanto qualquer uma das duas telas existir no DOM, o clique é
// recusado. Quem já viu o boot nessa sessão nem chega aqui: o script inline da
// index remove os dois elementos antes deste módulo rodar.
function bootEmAndamento() {
	return !!(
		document.getElementById("human-verify") ||
		document.getElementById("boot-terminal")
	);
}

// Som 8-bit de recusa (driken5482, Pixabay). Só é criado no primeiro clique
// negado — o boot já tem áudio próprio, não vale carregar mais um arquivo em
// toda página à toa.
let audioNegado = null;
function tocarNegado() {
	try {
		if (!audioNegado) {
			audioNegado = new Audio("/assets/wav/driken5482-retro-hurt-1-236672.mp3");
			audioNegado.volume = 0.12;
		}
		audioNegado.currentTime = 0;
		audioNegado.play().catch(() => {});
	} catch (e) {
		/* áudio é enfeite: se o navegador barrar, a balançada já dá o recado */
	}
}

function negar(botao) {
	tocarNegado();
	// Tira, força reflow e repõe a classe pra animação reiniciar em cliques
	// seguidos — sem o reflow no meio o navegador não vê mudança nenhuma.
	botao.classList.remove("negado");
	void botao.offsetWidth;
	botao.classList.add("negado");
}

export function iniciarBotaoRadio() {
	// Hoje a /radio/ nem carrega o main.js, então isto não deveria acontecer —
	// mas se um dia carregar, um atalho pra própria página seria só ruído.
	if (estaNaPaginaDoRadio()) return;
	if (document.getElementById("radio-botao")) return;

	if (!document.getElementById("radio-botao-style")) {
		const estilo = document.createElement("style");
		estilo.id = "radio-botao-style";
		estilo.textContent = CSS;
		document.head.appendChild(estilo);
	}

	const botao = document.createElement("a");
	botao.id = "radio-botao";
	botao.href = "/radio/";
	// title vira tooltip customizado (o script troca por data-smt-title e
	// remove o title); o aria-label é o que sobra pro leitor de tela.
	botao.title = "Rádio";
	botao.setAttribute("aria-label", "Abrir a página do rádio");
	botao.innerHTML = ICONE;

	botao.addEventListener("click", (e) => {
		if (!bootEmAndamento()) return;
		e.preventDefault();
		negar(botao);
	});

	botao.addEventListener("animationend", () => botao.classList.remove("negado"));

	document.body.appendChild(botao);
}
