// setup-bagels.js — o comando `bagels` do terminal da /setup/.
//
// Homenagem ao Bagels (https://github.com/EnhancedJax/Bagels). `bagels` sem
// argumento abre a tela cheia (setup-bagels-tui.js, que é o porte do desenho);
// com subcomando, responde na linha mesmo, que é mais rápido pra lançar uma
// coisa só e sair.
//
// O cofre e o formato moram no setup-bagels-dados.js — inclusive a explicação
// de por que isto não tem back-end.

import {
	MOEDA,
	acharCategoria,
	achatarCategorias,
	carteiraVazia,
	ehData,
	ehMes,
	gravar,
	hoje,
	interpretarValor,
	ler,
	mesAtual,
	mesDe,
	somar,
	valorProprio,
} from "./setup-bagels-dados.js";
import { abrirBagelsTui } from "./setup-bagels-tui.js";

const LARGURA_BARRA = 24;

// Barra de proporção em ASCII, no espírito dos gráficos do Bagels. Blocos
// cheios e vazios em vez de cor, pra ler igual em qualquer tema e sobreviver a
// copiar e colar a saída.
function barra(fracao) {
	const cheios = Math.max(0, Math.min(LARGURA_BARRA, Math.round(fracao * LARGURA_BARRA)));
	return "█".repeat(cheios) + "░".repeat(LARGURA_BARRA - cheios);
}

// Mesma escala do fastfetch logo acima: tranquilo / apertando / cheio.
// Reaproveita o .ff-pct[data-uso] que já existe no setup.css.
function faixaDeUso(percentual) {
	if (percentual >= 75) return "cheio";
	if (percentual >= 50) return "medio";
	return "tranquilo";
}

export function criarBagels({ criar, imprimir, tela, suspender }) {
	function doMes(carteira, mes) {
		return carteira.lancamentos.filter((l) => mesDe(l.data) === mes);
	}

	function linha(rotulo, valor, classeValor) {
		const el = criar("div", "ff-linha");
		el.appendChild(criar("span", "ff-rotulo", rotulo));
		el.appendChild(criar("span", `ff-valor ${classeValor || ""}`.trim(), valor));
		tela.appendChild(el);
	}

	function tabela(linhas) {
		const bloco = criar("div", "bagels-tabela");
		// As colunas saem do próprio conteúdo: o `list` tem cinco, o `cat` tem
		// quatro. Com um número fixo no CSS, a tabela de quatro escorregava pra
		// dentro da linha seguinte. A última é 1fr pra sobrar o resto da largura.
		const quantas = linhas[0]?.length || 1;
		bloco.style.gridTemplateColumns = "max-content ".repeat(quantas - 1) + "1fr";
		for (const colunas of linhas) {
			const l = criar("div", "bagels-linha");
			for (const [texto, classe] of colunas) l.appendChild(criar("span", classe, texto));
			bloco.appendChild(l);
		}
		tela.appendChild(bloco);
	}

	/* ----------------------------------------------------------- subcomandos */

	function resumo(args) {
		const mes = args.find(ehMes) || mesAtual();
		const carteira = ler();
		const lancamentos = doMes(carteira, mes);

		if (!lancamentos.length) {
			imprimir(`nada lançado em ${mes}.`);
			return;
		}

		const { entrou, saiu, saldo } = somar(lancamentos);
		imprimir(`resumo de ${mes} — ${lancamentos.length} lançamento(s)`, "bagels-titulo");
		linha("entrou", MOEDA.format(entrou));
		linha("saiu", MOEDA.format(saiu));
		linha("saldo", MOEDA.format(saldo), saldo < 0 ? "bagels-negativo" : "bagels-positivo");

		if (carteira.meta) {
			const pct = Math.round((saiu / carteira.meta) * 100);
			const el = criar("div", "ff-linha");
			el.appendChild(criar("span", "ff-rotulo", "meta"));
			const valor = criar("span", "ff-valor");
			valor.appendChild(
				document.createTextNode(`${MOEDA.format(saiu)} / ${MOEDA.format(carteira.meta)} `)
			);
			const marca = criar("span", "ff-pct", `(${pct}%)`);
			marca.dataset.uso = faixaDeUso(pct);
			valor.appendChild(marca);
			el.appendChild(valor);
			tela.appendChild(el);

			const sobra = carteira.meta - saiu;
			linha(
				sobra >= 0 ? "ainda dá pra gastar" : "passou da meta",
				MOEDA.format(Math.abs(sobra)),
				sobra >= 0 ? "bagels-positivo" : "bagels-negativo"
			);
		}
	}

	function adicionar(args) {
		const data = args.find(ehData) || hoje();
		const resto = args.filter((a) => !ehData(a));
		const valor = interpretarValor(resto[0]);
		const categoria = resto[1];

		if (!Number.isFinite(valor) || !categoria) {
			imprimir("uso: bagels add <valor> <categoria> [rótulo] [AAAA-MM-DD]", "ff-erro");
			imprimir("negativo é saída, positivo é entrada. ex.: bagels add -25,90 Delivery pastel");
			return;
		}

		const carteira = ler();
		const conhecida = acharCategoria(carteira, categoria);
		const registro = {
			id: carteira.proximoId,
			data,
			valor,
			categoria: conhecida ? conhecida.nome : categoria,
			descricao: resto.slice(2).join(" "),
			conta: carteira.contas[0]?.nome || "",
			divisoes: [],
		};
		carteira.lancamentos.push(registro);
		carteira.proximoId += 1;
		// Deixa de ser semente no instante em que entra algo de verdade.
		carteira.ficticia = false;

		if (!gravar(carteira)) {
			imprimir("não consegui gravar — o navegador bloqueou o armazenamento.", "ff-erro");
			return;
		}
		imprimir(
			`#${registro.id} ${registro.data} ${MOEDA.format(valor)} ${registro.categoria}` +
				(registro.descricao ? ` — ${registro.descricao}` : ""),
			valor < 0 ? "bagels-negativo" : "bagels-positivo"
		);
		if (!conhecida) {
			imprimir(`(categoria "${categoria}" não está na lista — veja bagels cats)`, "ff-erro");
		}
	}

	function listar(args) {
		const mes = args.find(ehMes) || mesAtual();
		const lancamentos = doMes(ler(), mes).sort((a, b) => a.data.localeCompare(b.data));

		if (!lancamentos.length) {
			imprimir(`nada lançado em ${mes}.`);
			return;
		}

		imprimir(`lançamentos de ${mes}`, "bagels-titulo");
		tabela(
			lancamentos.map((l) => [
				[`#${l.id}`, "bagels-id"],
				[l.data.slice(8), "bagels-dia"],
				[MOEDA.format(l.valor), l.valor < 0 ? "bagels-negativo" : "bagels-positivo"],
				[l.categoria, "bagels-categoria"],
				[l.descricao || "", "bagels-descricao"],
			])
		);
	}

	function remover(args) {
		const id = Number.parseInt(String(args[0]).replace("#", ""), 10);
		if (!Number.isFinite(id)) {
			imprimir("uso: bagels rm <id>  (o id aparece no bagels list)", "ff-erro");
			return;
		}
		const carteira = ler();
		const antes = carteira.lancamentos.length;
		carteira.lancamentos = carteira.lancamentos.filter((l) => l.id !== id);
		if (carteira.lancamentos.length === antes) {
			imprimir(`não achei o lançamento #${id}.`, "ff-erro");
			return;
		}
		gravar(carteira);
		imprimir(`#${id} apagado.`);
	}

	function porCategoria(args) {
		const mes = args.find(ehMes) || mesAtual();
		const saidas = doMes(ler(), mes).filter((l) => l.valor < 0);

		if (!saidas.length) {
			imprimir(`nenhuma saída em ${mes}.`);
			return;
		}

		const totais = new Map();
		for (const l of saidas) {
			// O que os outros devem não conta como meu gasto — é o "Self total"
			// das linhas divididas do original.
			totais.set(l.categoria, (totais.get(l.categoria) || 0) + -valorProprio(l));
		}
		const ordenado = [...totais.entries()].sort((a, b) => b[1] - a[1]);
		const maior = ordenado[0][1];
		const total = ordenado.reduce((soma, [, v]) => soma + v, 0);

		imprimir(`saídas por categoria em ${mes} — ${MOEDA.format(total)}`, "bagels-titulo");
		tabela(
			ordenado.map(([nome, valor]) => [
				[nome, "bagels-categoria"],
				[MOEDA.format(valor), "bagels-negativo"],
				[barra(valor / maior), "bagels-barra"],
				[`${Math.round((valor / total) * 100)}%`, "bagels-fatia"],
			])
		);
	}

	function listarCategorias() {
		const carteira = ler();
		const achatadas = achatarCategorias(carteira.categorias);
		if (!achatadas.length) {
			imprimir("sem categorias.");
			return;
		}
		imprimir("categorias", "bagels-titulo");
		tabela(
			achatadas.map((c) => [
				[c.mae ? `  ${c.nome}` : c.nome, "bagels-categoria"],
				[c.natureza, "bagels-fatia"],
				[c.mae || "", "bagels-descricao"],
			])
		);
	}

	function definirMeta(args) {
		const carteira = ler();
		if (!args.length) {
			imprimir(
				carteira.meta
					? `meta mensal de saídas: ${MOEDA.format(carteira.meta)}`
					: "sem meta. defina com: bagels meta 1200"
			);
			return;
		}
		if (args[0] === "off") {
			carteira.meta = null;
			gravar(carteira);
			imprimir("meta removida.");
			return;
		}
		const valor = Math.abs(interpretarValor(args[0]));
		if (!Number.isFinite(valor) || valor <= 0) {
			imprimir("uso: bagels meta <valor>  |  bagels meta off", "ff-erro");
			return;
		}
		carteira.meta = valor;
		gravar(carteira);
		imprimir(`meta mensal de saídas: ${MOEDA.format(valor)}`);
	}

	// Download de arquivo em vez de despejar JSON na tela: a linha do prompt tem
	// uma linha só, e colar um JSON inteiro de volta nela seria impraticável.
	function exportar() {
		const carteira = ler();
		const blob = new Blob([JSON.stringify(carteira, null, "\t")], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `bagels-${hoje()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		imprimir(`bagels-${hoje()}.json — ${carteira.lancamentos.length} lançamento(s).`);
	}

	// Seletor de arquivo pelo mesmo motivo. O <input> não entra no documento:
	// ficar fora do fluxo evita mexer na altura da página — foi isso que, no
	// tooltip, fazia nascer barra de rolagem e empurrar a página pro lado.
	function importar() {
		const campo = document.createElement("input");
		campo.type = "file";
		campo.accept = "application/json,.json";
		campo.addEventListener("change", async () => {
			const arquivo = campo.files?.[0];
			if (!arquivo) return;
			try {
				const dados = JSON.parse(await arquivo.text());
				if (!Array.isArray(dados.lancamentos)) throw new Error("formato desconhecido");
				const carteira = { ...carteiraVazia(), ...dados };
				// Reconstruído, não confiado: um arquivo editado à mão pode trazer
				// proximoId menor que os ids existentes e gerar id repetido.
				carteira.proximoId =
					carteira.lancamentos.reduce((maior, l) => Math.max(maior, l.id || 0), 0) + 1;
				gravar(carteira);
				imprimir(`importado: ${carteira.lancamentos.length} lançamento(s).`);
			} catch (erro) {
				imprimir(`não consegui ler esse arquivo: ${erro.message}`, "ff-erro");
			}
		});
		campo.click();
		imprimir("escolha o arquivo .json exportado antes.");
	}

	// Duas etapas de propósito: é o único comando que apaga tudo, e não há
	// desfazer. Quem digitou sem querer tem como parar no meio.
	let aguardandoReset = false;
	function zerar(args) {
		if (args[0] === "sim") {
			if (!aguardandoReset) {
				imprimir("rode `bagels reset` primeiro.", "ff-erro");
				return;
			}
			aguardandoReset = false;
			gravar(carteiraVazia());
			imprimir("tudo apagado — inclusive as contas e categorias de exemplo.");
			return;
		}
		aguardandoReset = true;
		imprimir("isso apaga todos os lançamentos, sem desfazer.", "ff-erro");
		imprimir("exporte antes se quiser guardar. pra confirmar: bagels reset sim");
	}

	const AJUDA = [
		["bagels", "abre a tela cheia"],
		["bagels sum [AAAA-MM]", "resumo do mês, na linha"],
		["bagels add <valor> <cat> [rótulo]", "lança (negativo = saída)"],
		["bagels list [AAAA-MM]", "lançamentos do mês"],
		["bagels cat [AAAA-MM]", "saídas por categoria, com barra"],
		["bagels cats", "as categorias e a natureza de cada uma"],
		["bagels rm <id>", "apaga um lançamento"],
		["bagels meta <valor|off>", "limite mensal de saídas"],
		["bagels export", "baixa um .json com tudo"],
		["bagels import", "lê um .json exportado"],
		["bagels reset", "apaga tudo (pede confirmação)"],
	];

	function ajuda() {
		imprimir("bagels — controle de gastos, guardado só neste navegador", "bagels-titulo");
		const lista = criar("div", "ff-ajuda");
		for (const [uso, descricao] of AJUDA) {
			const item = criar("div", "ff-linha");
			item.appendChild(criar("span", "ff-rotulo", uso));
			item.appendChild(criar("span", "ff-valor", descricao));
			lista.appendChild(item);
		}
		tela.appendChild(lista);
	}

	const SUB = {
		sum: resumo,
		add: adicionar,
		list: listar,
		ls: listar,
		cat: porCategoria,
		cats: listarCategorias,
		rm: remover,
		meta: definirMeta,
		export: exportar,
		import: importar,
		reset: zerar,
		help: ajuda,
	};

	function abrirTela() {
		// Mesmo contrato do cmatrix: o prompt fica suspenso enquanto a tela está
		// aberta e volta sozinho quando ela fecha.
		return suspender((retomar) => abrirBagelsTui({ aoSair: retomar }));
	}

	return function bagels(args) {
		if (!args.length) return abrirTela();
		const sub = SUB[args[0].toLowerCase()];
		if (!sub) {
			// Sem subcomando conhecido pode ser só um mês: `bagels 2026-09`.
			if (ehMes(args[0])) return resumo(args);
			imprimir(`bagels: "${args[0]}" não é um subcomando. veja: bagels help`, "ff-erro");
			return;
		}
		sub(args.slice(1));
	};
}
