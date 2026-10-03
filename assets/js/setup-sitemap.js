// setup-sitemap.js — o comando `sitemap` do terminal da /setup/.
//
// Mesma fonte da /sitemap/ de verdade: o sitemap-data.js. Não existe uma
// segunda lista de páginas em lugar nenhum — mexer lá muda os dois.
//
// O desenho é o do "branched menu": tronco vertical, cotovelos saindo pra cada
// item e as seções abrindo e fechando. Duas coisas mudaram em relação ao
// componente de referência, e por motivo:
//
//   - Ele é React; aqui é DOM na mão, porque o projeto não tem build nem npm.
//   - Ele desenha os galhos em SVG com `stroke-dashoffset`, assumindo linhas de
//     altura fixa num nível só. Este sitemap aninha até três níveis
//     (/galeria/arte/2kki/, /save/w/w-lewd/, /picrew/char-somehow/) e a altura
//     de uma seção aberta varia, então a geometria em SVG teria que ser medida
//     e remedida a cada abertura. Os cotovelos aqui são borda com canto
//     arredondado, que aguenta aninhamento e altura variável sem medir nada. A
//     abertura/fechamento (grid-template-rows de 0fr pra 1fr) é a do original.
//
// As cores saem das variáveis de tema, como o resto da /setup/.

import sitemap from "./sitemap-data.js";

// O sitemap-data mistura dois formatos: nós com `children` e agrupadores soltos
// com `items` (um deles sem href nem label nenhum, só pra juntar a /mplace/).
// Agrupador não vira nada na tela — os filhos dele sobem um nível.
function achatar(lista) {
	const saida = [];
	for (const item of lista || []) {
		if (Array.isArray(item.items)) saida.push(...achatar(item.items));
		else saida.push(item);
	}
	return saida;
}

export function montarSitemap({ tela, imprimir }) {
	function criar(tag, classe, texto) {
		const el = document.createElement(tag);
		if (classe) el.className = classe;
		if (texto !== undefined) el.textContent = texto;
		return el;
	}

	function montarLink(item) {
		const a = criar("a", "mapa-item", item.label);
		a.href = item.href;
		if (item.external) {
			a.target = "_blank";
			a.rel = "noopener noreferrer";
			a.append(criar("span", "mapa-fora", "↗"));
		}
		return a;
	}

	// Um nó: a linha dele e, se tiver filhos, o bloco que abre embaixo. A
	// recursão é o que dá conta dos três níveis.
	function montarNo(item, nivel) {
		const no = criar("div", "mapa-no");
		const filhos = achatar(item.children);

		if (!filhos.length) {
			no.append(montarLink(item));
			return no;
		}

		const secao = criar("div", "mapa-secao");
		// Só o primeiro nível nasce aberto. Assim o comando mostra as seções do
		// site de cara, e o que está mais fundo (/galeria/arte/, /save/w/,
		// /picrew/) fica dobrado em vez de despejar as 28 páginas de uma vez.
		if (nivel < 1) secao.dataset.aberta = "";

		const cabeca = criar("button", "mapa-cabeca");
		cabeca.type = "button";
		cabeca.setAttribute("aria-expanded", nivel < 1 ? "true" : "false");
		cabeca.append(criar("span", "mapa-seta", "▸"));
		cabeca.append(criar("span", "mapa-cabeca-nome", item.label));

		// O rótulo da seção também é uma página; o link fica ao lado do botão em
		// vez de dentro dele, pra o clique de abrir não virar navegação.
		if (item.href) {
			const atalho = criar("a", "mapa-atalho", "abrir");
			atalho.href = item.href;
			cabeca.after(atalho);
			secao.append(cabeca, atalho);
		} else {
			secao.append(cabeca);
		}

		const corpo = criar("div", "mapa-corpo");
		const dobra = criar("div", "mapa-dobra");
		const ramos = criar("div", "mapa-ramos");
		for (const filho of filhos) ramos.append(montarNo(filho, nivel + 1));
		dobra.append(ramos);
		corpo.append(dobra);
		secao.append(corpo);

		cabeca.addEventListener("click", () => {
			const aberta = secao.hasAttribute("data-aberta");
			secao.toggleAttribute("data-aberta", !aberta);
			cabeca.setAttribute("aria-expanded", String(!aberta));
		});

		no.append(secao);
		return no;
	}

	const nav = criar("nav", "mapa");
	nav.setAttribute("aria-label", "mapa do site");
	for (const item of achatar(sitemap)) nav.append(montarNo(item, 0));

	const quantas = nav.querySelectorAll(".mapa-item, .mapa-atalho").length;
	imprimir(`mapa do site — ${quantas} páginas`, "bagels-titulo");
	tela.append(nav);
}
