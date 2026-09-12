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

function areFestiveEffectsEnabled() {
	return localStorage.getItem("festiveEffects") !== "false";
}

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

		// Dezembro - Natal
		if (now.getMonth() === 11) {
			import("/assets/js/snow.js")
				.then(({ snowEffect }) => snowEffect())
				.catch((err) => console.error("Erro ao carregar snow.js:", err));

			document.documentElement.style.setProperty(
				"--clr-main-a0",
				"var(--clr-green-a0)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a10",
				"var(--clr-green-a10)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a20",
				"var(--clr-green-a20)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a30",
				"var(--clr-green-a30)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a40",
				"var(--clr-green-a40)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a50",
				"var(--clr-green-a50)"
			);

			const style = document.createElement("style");
			style.id = "xmas-style";
			// Pra deixar as imagens verdes também
			style.textContent = `
	      img.img-clr-main, .novo-icone, div#header-expandida::before {
	        filter: hue-rotate(180deg) saturate(110%) brightness(90%);
	      }
	      :root[data-theme="light"] img.img-clr-main, :root[data-theme="light"] .novo-icone, :root[data-theme="light"] div#header-expandida::before {
	        filter: hue-rotate(180deg) saturate(110%) brightness(110%) contrast(1.3);
	      }
	    `;
			if (!document.getElementById("xmas-style")) {
				document.head.appendChild(style);
			}
		}

		// Semana do Halloween: 25 a 31 de Outubro
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

			document.documentElement.style.setProperty(
				"--clr-main-a0",
				"var(--clr-orange-a0)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a10",
				"var(--clr-orange-a10)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a20",
				"var(--clr-orange-a20)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a30",
				"var(--clr-orange-a30)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a40",
				"var(--clr-orange-a40)"
			);
			document.documentElement.style.setProperty(
				"--clr-main-a50",
				"var(--clr-orange-a50)"
			);

			// tonalidade laranja/roxo para alguns elementos
			const style = document.createElement("style");
			style.id = "halloween-style";
			style.textContent = `
	      img.img-clr-main, .novo-icone, div#header-expandida::before {
	        filter: hue-rotate(50deg) saturate(150%) brightness(90%);
	      }
	      :root[data-theme="light"] img.img-clr-main, :root[data-theme="light"] .novo-icone, :root[data-theme="light"] div#header-expandida::before {
	        filter: hue-rotate(50deg) saturate(150%) brightness(110%) contrast(1);
	      }
	    `;
			if (!document.getElementById(style.id)) document.head.appendChild(style);
		}

		// 26 de maio - executa 1 vez por sessão
		if (isDate(5, 26)) {
			if (!sessionStorage.getItem("confettiDone")) {
				import("/assets/js/confetti.js").then((m) => {
					m.confettiEffect();
					sessionStorage.setItem("confettiDone", "true");
				});
			}
		}
	}
});
