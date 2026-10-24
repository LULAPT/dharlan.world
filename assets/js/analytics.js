// Vercel Web Analytics — versão HTML puro (sem npm/build step), injetada
// aqui já que o site inteiro carrega assets/js/main.js.
// https://vercel.com/docs/analytics/quickstart
export function initAnalytics() {
	window.va =
		window.va ||
		function () {
			(window.vaq = window.vaq || []).push(arguments);
		};

	const script = document.createElement("script");
	script.defer = true;
	script.src = "https://cdn.vercel-insights.com/v1/script.js";
	document.head.appendChild(script);
}
