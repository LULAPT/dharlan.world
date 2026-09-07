// Bloqueia o menu de contexto e atalhos comuns de inspeção/visualização de
// código-fonte. Isso não impede de fato o acesso ao código: basta digitar
// view-source: na barra de endereço, desativar o JS ou abrir o DevTools
// pelo menu do navegador. Serve só como obstáculo pro usuário casual.
(function () {
	// Exceção: dentro de um elemento marcado com .permite-contexto o menu de
	// contexto continua funcionando. É o caso do player de Flash da /picrew/,
	// onde o menu é do próprio Ruffle (qualidade, tela cheia, volume) e não do
	// navegador — bloquear ali só tirava função do jogo, sem esconder nada.
	function permiteContexto(e) {
		// O Ruffle não chama preventDefault quando o Shift está pressionado (ele
		// deixa passar de propósito, pra dar acesso ao menu nativo). Sem esta
		// checagem, shift+clique direito dentro do jogo viraria uma porta de
		// entrada pro "inspecionar elemento".
		if (e.shiftKey) return false;
		const alvo = e.target;
		return !!(alvo && alvo.closest && alvo.closest(".permite-contexto"));
	}

	document.addEventListener(
		"contextmenu",
		function (e) {
			if (permiteContexto(e)) return;
			e.preventDefault();
			return false;
		},
		{ passive: false }
	);

	document.addEventListener(
		"keydown",
		function (event) {
			const key = event.key ? event.key.toUpperCase() : "";
			const isCtrlOrCmd = event.ctrlKey || event.metaKey;

			// F12: abre o DevTools
			const isF12 = event.keyCode === 123;
			// Ctrl/Cmd+Shift+I/J/C: DevTools (inspecionar, console, elementos)
			const isDevtoolsCombo =
				isCtrlOrCmd && event.shiftKey && ["I", "J", "C", "U"].includes(key);
			// Ctrl/Cmd+U: ver código-fonte da página
			const isViewSource = isCtrlOrCmd && !event.shiftKey && key === "U";

			if (isF12 || isDevtoolsCombo || isViewSource) {
				event.preventDefault();
				return false;
			}
		},
		{ passive: false, capture: false }
	);
})();
