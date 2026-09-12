// radio-page.js — o deck completo da /radio/.
// A marcação e a fiação estão em radio-ui.js, compartilhadas com o mini player.

import { carregarEstacoes } from "/assets/js/radio.js";
import { montarPlayer } from "/assets/js/radio-ui.js";

export async function iniciarRadioPagina() {
	const alvo = document.getElementById("radio-app");
	if (!alvo) return;

	let estacoes;
	try {
		estacoes = await carregarEstacoes();
	} catch (erro) {
		console.error("Rádio:", erro.message);
		alvo.textContent = "as estações não carregaram. recarrega a página?";
		return;
	}

	montarPlayer(alvo, estacoes, { titulo: "RADIO" });
}
