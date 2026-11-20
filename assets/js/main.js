import "/assets/js/settings-panel.js";
import { carregarNavbar } from "/assets/js/navbar.js";
import { carregarFooter } from "/assets/js/footer.js";
import { toggleCrt } from "/assets/js/toggle-crt.js";
import { fadeIn } from "/assets/js/fade-in.js";
import { enableTooltips } from "/assets/js/jquery.style-my-tooltips.js";
import { initHeaderMobile } from "/assets/js/header-mobile.js";
import { enableLightMode } from "/assets/js/light-mode.js";
import { initSettingsPanel } from "/assets/js/settings-panel.js";
// import { smoothScroll } from "/assets/js/smooth-scroll.js";
// import { setupViewportAnimations } from "/assets/js/viewport-animations.js";
import { wavyText } from "/assets/js/wavy-text.js";
import { setPageTitle } from "/assets/js/page-title.js";
import { animateFavicon } from "/assets/js/animated-favicon.js";
import { initAnalytics } from "/assets/js/analytics.js";
import { iniciarBotaoRadio } from "/assets/js/radio-botao.js";

function isDate(month1to12, day) {
	const n = new Date();
	return n.getMonth() + 1 === month1to12 && n.getDate() === day;
}

// Padrão: efeitos festivos LIGADOS — só desliga quem marcar "false" no painel.
//
// A chave se chamava `festiveEffects`. Por um tempo o padrão foi desligado e
// este arquivo gravava "false" pra todo visitante novo, sem ele ter escolhido
// nada. Quando o padrão voltou a ser ligado, essas pessoas ficariam com o
// "false" pra sempre — por isso a chave foi renomeada (mesmo caso do
// radio-destacado → radio-flutuar) e a velha é apagada.
function areFestiveEffectsEnabled() {
	return localStorage.getItem("visuaisFestivos") !== "false";
}

try {
	localStorage.removeItem("festiveEffects");
} catch (e) {}

// Exportar função para uso externo se necessário
window.areFestiveEffectsEnabled = areFestiveEffectsEnabled;

document.addEventListener("DOMContentLoaded", () => {
	import("/assets/js/dither.js").catch((err) =>
		console.error("Erro ao carregar dither.js:", err)
	);

	// Rádio destacado: vem ligado por padrão (ver estaDestacado no radio.js),
	// mas só monta pra quem já usou o rádio alguma vez — sem radio-estado
	// salvo não há o que retomar, e toda página pagaria o import à toa pra
	// mostrar um deck parado no canto de quem nunca abriu a /radio/.
	if (
		localStorage.getItem("radio-flutuar") !== "false" &&
		localStorage.getItem("radio-estado")
	) {
		import("/assets/js/radio-mini.js")
			.then(({ iniciarRadioMini }) => iniciarRadioMini())
			.catch((err) => console.error("Erro ao carregar radio-mini.js:", err));
	}

	initAnalytics();
	carregarNavbar();
	carregarFooter();
	setPageTitle();
	animateFavicon();
	toggleCrt();
	fadeIn();
	// Antes do enableTooltips(): o script lê os title que já estão no DOM, então
	// um botão criado depois dele ficaria com o tooltip nativo do navegador.
	iniciarBotaoRadio();
	enableTooltips();
	initHeaderMobile();
	enableLightMode();
	initSettingsPanel();
	// smoothScroll();
	wavyText();

	// Inicializa animações de scroll
	// setupViewportAnimations({
	//   cascade: true,
	//   selector: ".animate-on-scroll",
	//   animationClass: "fade-in",
	// });

	// Verificar se efeitos festivos estão habilitados
	const festiveEnabled = areFestiveEffectsEnabled();

	if (festiveEnabled) {
		const now = new Date();

		// Dezembro - Natal: só a neve. A paleta continua a do tema — o verde
		// que trocava os destaques rosa saiu a pedido do dono.
		if (now.getMonth() === 11) {
			import("/assets/js/snow.js")
				.then(({ snowEffect }) => snowEffect())
				.catch((err) => console.error("Erro ao carregar snow.js:", err));
		}

		// Semana do Halloween: 25 a 31 de outubro
		if (now.getMonth() === 9 && now.getDate() >= 25 && now.getDate() <= 31) {
			import("/assets/js/halloween.js")
				.then(({ halloweenEffect }) => {
					try {
						halloweenEffect();
					} catch (err) {
						console.error("Erro ao iniciar halloweenEffect:", err);
					}
				})
				.catch((err) => console.error("Erro ao carregar halloween.js:", err));
			// Só as teias e a aranha do halloween.js: a troca dos destaques
			// pro laranja saiu, como o verde do Natal.
		}

		// 8 de outubro, aniversário do dharlan — confete, 1 vez por sessão
		if (isDate(10, 8)) {
			if (!sessionStorage.getItem("confettiDone")) {
				import("/assets/js/confetti.js").then((m) => {
					m.confettiEffect();
					sessionStorage.setItem("confettiDone", "true");
				});
			}
		}
	}
});
