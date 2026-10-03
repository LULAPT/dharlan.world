// setup-bagels-tui.js — a tela cheia do bagels, no desenho do TUI original.
//
// O Bagels (https://github.com/EnhancedJax/Bagels) é um TUI em Python feito com
// Textual. Aqui não existe terminal de verdade: o "terminal" da /setup/ é uma
// pilha de divs, sem cursor endereçável nem tela que se redesenha. Então os
// painéis são divs com borda e o título encaixado na borda de cima — que é
// exatamente o que o Textual desenha com caracteres de caixa. O resultado é o
// mesmo desenho, sem depender de a fonte ter ╭ ╮ ╰ ╯ na largura certa.
//
// As cores não são as do original (roxo e laranja): saem todas das variáveis de
// tema do site, então o TUI acompanha `dark`, `light` e `steam-green` sem
// nenhuma regra extra. É a mesma escolha do resto da /setup/.

import {
	MOEDA,
	NUMERO,
	achatarCategorias,
	comoISO,
	corDaCategoria,
	gravar,
	hoje,
	interpretarValor,
	ler,
	mesDe,
	somar,
	valorProprio,
} from "./setup-bagels-dados.js";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function criar(tag, classe, texto) {
	const el = document.createElement(tag);
	if (classe) el.className = classe;
	if (texto !== undefined) el.textContent = texto;
	return el;
}

// Painel = borda com o título encaixado em cima, como o Textual desenha.
function painel(titulo, classe) {
	const caixa = criar("section", `bg-painel ${classe || ""}`.trim());
	caixa.appendChild(criar("h2", "bg-painel-titulo", titulo));
	const corpo = criar("div", "bg-painel-corpo");
	caixa.appendChild(corpo);
	caixa.corpo = corpo;
	return caixa;
}

function ponto(cor) {
	const el = criar("span", "bg-ponto");
	el.style.color = `var(--clr-${cor}-a30)`;
	return el;
}

function inicioDaSemana(data) {
	const d = new Date(data + "T00:00:00");
	d.setDate(d.getDate() - d.getDay());
	return d;
}

function somarDias(d, n) {
	const nova = new Date(d);
	nova.setDate(nova.getDate() + n);
	return nova;
}

function rotuloCurto(d) {
	return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function abrirBagelsTui({ aoSair }) {
	let carteira = ler();
	let aba = "home";
	let tipo = "saida"; // o "View and add: Expense / Income" do original
	let semana = inicioDaSemana(hoje());
	let selecionado = 0;
	let formulario = null;

	const raiz = criar("div", "bg-tui");
	raiz.setAttribute("role", "dialog");
	raiz.setAttribute("aria-label", "bagels");
	document.body.appendChild(raiz);
	// A marca no <body> é o que o bagels.css usa pra esconder o botão do rádio
	// enquanto esta tela está aberta. Fica aqui e não num style direto no
	// elemento porque o #radio-botao é criado por outro módulo, que injeta o
	// próprio <style> — mexer nele daqui seria um módulo escrevendo no outro.
	document.body.classList.add("bagels-aberto");

	/* ------------------------------------------------------------- consultas */

	function diasDaSemana() {
		return Array.from({ length: 7 }, (_, i) => comoISO(somarDias(semana, i)));
	}

	function daSemana() {
		const dias = diasDaSemana();
		return carteira.lancamentos
			.filter((l) => dias.includes(l.data))
			.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
	}

	function doMes(mes) {
		return carteira.lancamentos.filter((l) => mesDe(l.data) === mes);
	}

	/* ------------------------------------------------------------- cabeçalho */

	function montarTopo() {
		const topo = criar("header", "bg-topo");
		const marca = criar("div", "bg-marca");
		marca.appendChild(criar("span", "bg-seta", "↪"));
		marca.appendChild(criar("span", "bg-nome", "Bagels"));
		marca.appendChild(criar("span", "bg-versao", "0.3.2"));
		topo.appendChild(marca);

		const abas = criar("nav", "bg-abas");
		for (const [chave, rotulo] of [["home", "Home"], ["manager", "Manager"]]) {
			const b = criar("button", `bg-aba ${aba === chave ? "ativa" : ""}`.trim(), rotulo);
			b.type = "button";
			b.addEventListener("click", () => {
				aba = chave;
				desenhar();
			});
			abas.appendChild(b);
		}
		topo.appendChild(abas);

		topo.appendChild(
			criar("div", "bg-instancia", carteira.ficticia ? "dados fictícios" : "instance")
		);
		return topo;
	}

	/* ------------------------------------------------------------- aba: home */

	function montarContas() {
		const p = painel("Contas");
		if (!carteira.contas.length) {
			p.corpo.appendChild(criar("div", "bg-vazio", "sem contas"));
			return p;
		}
		for (const conta of carteira.contas) {
			const l = criar("div", "bg-conta");
			l.appendChild(criar("span", "bg-conta-nome", conta.nome));
			l.appendChild(criar("span", "bg-conta-saldo", NUMERO.format(conta.saldo)));
			p.corpo.appendChild(l);
		}
		return p;
	}

	function montarTipo() {
		const p = painel("Ver e lançar", "bg-tipo");
		const grupo = criar("div", "bg-alternador");
		for (const [chave, rotulo] of [["saida", "Saída"], ["entrada", "Entrada"]]) {
			const b = criar("button", `bg-opcao ${tipo === chave ? "ativa" : ""}`.trim(), rotulo);
			b.type = "button";
			b.addEventListener("click", () => {
				tipo = chave;
				desenhar();
			});
			grupo.appendChild(b);
		}
		p.corpo.appendChild(grupo);
		return p;
	}

	function montarPeriodo() {
		const p = painel("Período");
		const fim = somarDias(semana, 6);

		const nav = criar("div", "bg-periodo-nav");
		const antes = criar("button", "bg-passo", "<<<");
		antes.type = "button";
		antes.addEventListener("click", () => {
			semana = somarDias(semana, -7);
			desenhar();
		});
		const depois = criar("button", "bg-passo", ">>>");
		depois.type = "button";
		depois.addEventListener("click", () => {
			semana = somarDias(semana, 7);
			desenhar();
		});
		nav.append(antes, criar("span", "bg-periodo-rotulo", `${rotuloCurto(semana)} — ${rotuloCurto(fim)}`), depois);
		p.corpo.appendChild(nav);

		const grade = criar("div", "bg-calendario");
		for (const d of DIAS) grade.appendChild(criar("span", "bg-cal-cabecalho", d));

		// O mês inteiro, com a semana escolhida acesa — como o original faz.
		//
		// Numa semana que cruza a virada do mês (27 set a 3 out) só um dos dois
		// meses cabe no desenho. A escolha: o mês de hoje, quando hoje está na
		// semana à vista — é o que a pessoa espera ver ao abrir. Fora disso, o
		// mês do fim da semana, pra navegar pra trás já mostrar o mês de destino.
		const dias = diasDaSemana();
		const meio = new Date(
			(dias.includes(hoje()) ? hoje() : dias[6]) + "T00:00:00"
		);
		const primeiro = new Date(meio.getFullYear(), meio.getMonth(), 1);
		const vazios = primeiro.getDay();
		const ultimos = new Date(meio.getFullYear(), meio.getMonth() + 1, 0).getDate();
		for (let i = 0; i < vazios; i++) grade.appendChild(criar("span", "bg-cal-dia fora"));

		const naSemana = new Set(diasDaSemana());
		for (let dia = 1; dia <= ultimos; dia++) {
			const iso = comoISO(new Date(meio.getFullYear(), meio.getMonth(), dia));
			const classes = ["bg-cal-dia"];
			if (naSemana.has(iso)) classes.push("ativo");
			if (iso === hoje()) classes.push("hoje");
			const cel = criar("button", classes.join(" "), String(dia));
			cel.type = "button";
			cel.addEventListener("click", () => {
				semana = inicioDaSemana(iso);
				desenhar();
			});
			grade.appendChild(cel);
		}
		p.corpo.appendChild(grade);
		return p;
	}

	function montarInsights() {
		const p = painel("Insights");
		const lancamentos = daSemana().filter((l) => l.valor < 0);
		const total = lancamentos.reduce((s, l) => s + -valorProprio(l), 0);

		const topo = criar("div", "bg-insight-topo");
		const a = criar("div", "bg-insight");
		a.appendChild(criar("span", "bg-insight-rotulo", `Saídas de ${rotuloCurto(semana)}`));
		a.appendChild(criar("strong", "bg-insight-valor", NUMERO.format(total)));
		const b = criar("div", "bg-insight");
		b.appendChild(criar("span", "bg-insight-rotulo", "Por dia"));
		b.appendChild(criar("strong", "bg-insight-valor", NUMERO.format(total / 7)));
		topo.append(a, b);
		p.corpo.appendChild(topo);

		// Agrupa pela categoria-mãe, que é o recorte que o original mostra aqui.
		const achatadas = achatarCategorias(carteira.categorias);
		const porMae = new Map();
		for (const l of lancamentos) {
			const cat = achatadas.find((c) => c.nome === l.categoria);
			const chave = cat?.mae || cat?.nome || l.categoria;
			porMae.set(chave, (porMae.get(chave) || 0) + -valorProprio(l));
		}
		const ordenado = [...porMae.entries()].sort((x, y) => y[1] - x[1]);

		const faixa = criar("div", "bg-faixa");
		for (const [nome, valor] of ordenado) {
			const parte = criar("span", "bg-faixa-parte");
			parte.style.flexGrow = String(valor);
			parte.style.background = `var(--clr-${corDaCategoria(carteira, nome)}-a30)`;
			faixa.appendChild(parte);
		}
		if (!ordenado.length) faixa.appendChild(criar("span", "bg-faixa-vazia"));
		p.corpo.appendChild(faixa);

		const lista = criar("div", "bg-legenda");
		for (const [nome, valor] of ordenado) {
			const item = criar("div", "bg-legenda-item");
			item.appendChild(ponto(corDaCategoria(carteira, nome)));
			item.appendChild(criar("span", "bg-legenda-nome", nome));
			item.appendChild(
				criar("span", "bg-legenda-pct", `${Math.round((valor / (total || 1)) * 100)}%`)
			);
			item.appendChild(criar("span", "bg-legenda-valor", `(${NUMERO.format(valor)})`));
			lista.appendChild(item);
		}
		p.corpo.appendChild(lista);
		return p;
	}

	function montarModelos() {
		const p = painel("Modelos");
		const faixa = criar("div", "bg-modelos");
		carteira.modelos.forEach((modelo, i) => {
			const b = criar("button", "bg-modelo");
			b.type = "button";
			b.appendChild(ponto(corDaCategoria(carteira, modelo.categoria)));
			b.appendChild(criar("span", "bg-modelo-nome", modelo.nome));
			b.appendChild(criar("span", "bg-modelo-tecla", String(i + 1)));
			b.addEventListener("click", () => aplicarModelo(i));
			faixa.appendChild(b);
		});
		if (!carteira.modelos.length) faixa.appendChild(criar("div", "bg-vazio", "sem modelos"));
		p.corpo.appendChild(faixa);
		return p;
	}

	function montarRegistros() {
		const p = painel("Lançamentos", "bg-registros");
		const lancamentos = daSemana();
		if (selecionado >= lancamentos.length) selecionado = Math.max(0, lancamentos.length - 1);

		const tabela = criar("div", "bg-tabela");
		const cabecalho = criar("div", "bg-tabela-cabecalho");
		for (const t of ["Categoria", "Valor", "Rótulo", "Conta"]) {
			cabecalho.appendChild(criar("span", "", t));
		}
		tabela.appendChild(cabecalho);

		let diaAtual = null;
		lancamentos.forEach((l, indice) => {
			if (l.data !== diaAtual) {
				diaAtual = l.data;
				const sep = criar("div", "bg-tabela-dia");
				sep.appendChild(criar("span", "", `// ${l.data.slice(8)}/${l.data.slice(5, 7)}`));
				tabela.appendChild(sep);
			}

			const linha = criar("div", `bg-tabela-linha ${indice === selecionado ? "selecionada" : ""}`.trim());
			const cat = criar("span", "bg-celula-categoria");
			cat.appendChild(ponto(corDaCategoria(carteira, l.categoria)));
			cat.appendChild(criar("span", "", l.categoria));
			linha.appendChild(cat);

			const valor = criar("span", "bg-celula-valor");
			valor.appendChild(
				criar("span", l.valor < 0 ? "bg-sinal-menos" : "bg-sinal-mais", l.valor < 0 ? "−" : "+")
			);
			valor.appendChild(criar("span", "", NUMERO.format(Math.abs(l.valor))));
			linha.appendChild(valor);

			linha.appendChild(criar("span", "bg-celula-rotulo", l.descricao || "-"));
			linha.appendChild(criar("span", "bg-celula-conta", l.conta || "-"));
			linha.addEventListener("click", () => {
				selecionado = indice;
				desenhar();
			});
			tabela.appendChild(linha);

			// As divisões: quem deve o quê, e o que sobra sendo de fato meu.
			for (const divisao of l.divisoes || []) {
				const sub = criar("div", "bg-tabela-divisao");
				sub.appendChild(criar("span", "", `└ × ${divisao.pessoa}`));
				const v = criar("span", "bg-celula-valor");
				v.appendChild(criar("span", "bg-sinal-mais", "+"));
				v.appendChild(criar("span", "", NUMERO.format(divisao.valor)));
				sub.appendChild(v);
				sub.appendChild(criar("span", "", "-"));
				sub.appendChild(criar("span", "", "-"));
				tabela.appendChild(sub);
			}
			if ((l.divisoes || []).length) {
				const total = criar("div", "bg-tabela-total");
				total.appendChild(criar("span", "", "   Meu total"));
				total.appendChild(criar("span", "bg-celula-valor", `= ${NUMERO.format(Math.abs(valorProprio(l)))}`));
				total.appendChild(criar("span", "", ""));
				total.appendChild(criar("span", "", ""));
				tabela.appendChild(total);
			}
		});

		if (!lancamentos.length) {
			tabela.appendChild(criar("div", "bg-vazio", "nada nesta semana. aperte A pra lançar."));
		}
		p.corpo.appendChild(tabela);
		return p;
	}

	/* ---------------------------------------------------------- aba: manager */

	function montarGrafico() {
		const p = painel("Gastos");
		const mes = mesDe(hoje());
		const ultimo = new Date(
			Number(mes.slice(0, 4)),
			Number(mes.slice(5, 7)),
			0
		).getDate();

		const porDia = new Array(ultimo).fill(0);
		for (const l of doMes(mes)) {
			if (l.valor < 0) porDia[Number(l.data.slice(8)) - 1] += -valorProprio(l);
		}
		const teto = Math.max(...porDia, 1);

		// SVG esticado pelo painel, com `preserveAspectRatio: none` pro desenho
		// acompanhar a largura. Por isso é uma POLILINHA e não uma fila de
		// círculos: num viewBox de ~31 por 100 esticado pra centenas de pixels, o
		// círculo vira uma elipse gigante — foi exatamente o que aconteceu aqui.
		// Com `vector-effect: non-scaling-stroke` a espessura e o tracejado ficam
		// em pixels de tela, imunes à distorção, e saem pontilhados como no
		// original.
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("class", "bg-grafico");
		svg.setAttribute("viewBox", `0 0 ${ultimo} 100`);
		svg.setAttribute("preserveAspectRatio", "none");
		const traco = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
		traco.setAttribute(
			"points",
			porDia.map((v, i) => `${i + 0.5},${100 - (v / teto) * 92 - 4}`).join(" ")
		);
		svg.appendChild(traco);
		const moldura = criar("div", "bg-grafico-moldura");
		moldura.appendChild(criar("span", "bg-grafico-teto", NUMERO.format(teto)));
		moldura.appendChild(svg);
		moldura.appendChild(criar("span", "bg-grafico-piso", "0,00"));
		p.corpo.appendChild(moldura);
		p.corpo.appendChild(criar("div", "bg-grafico-eixo", `01 — ${ultimo} de ${MESES[Number(mes.slice(5, 7)) - 1]}`));
		return p;
	}

	function montarOrcamento() {
		const p = painel("Orçamento");
		const mes = mesDe(hoje());
		const { entrou, saiu } = somar(doMes(mes));

		const achatadas = achatarCategorias(carteira.categorias);
		let preciso = 0;
		let quero = 0;
		for (const l of doMes(mes)) {
			if (l.valor >= 0) continue;
			const cat = achatadas.find((c) => c.nome === l.categoria);
			if (cat?.natureza === "quero") quero += -valorProprio(l);
			else preciso += -valorProprio(l);
		}

		const guardar = entrou * carteira.orcamento.poupanca;
		const cotaQuero = Math.max(0, (entrou - guardar - preciso) * carteira.orcamento.desejos);
		const sobra = entrou - saiu;

		const resumo = criar("div", "bg-orcamento-topo");
		for (const [rotulo, valor, classe] of [
			["Gastei", saiu, "bg-sinal-menos"],
			["Sobrou", sobra, sobra >= 0 ? "bg-sinal-mais" : "bg-sinal-menos"],
			["Guardar", guardar, ""],
		]) {
			const item = criar("div", "bg-orcamento-item");
			item.appendChild(criar("span", "bg-insight-rotulo", rotulo));
			item.appendChild(criar("strong", `bg-insight-valor ${classe}`.trim(), NUMERO.format(valor)));
			resumo.appendChild(item);
		}
		p.corpo.appendChild(resumo);

		const barra = criar("div", "bg-barra");
		const partes = [
			["preciso", preciso],
			["quero", quero],
			["guardar", Math.max(0, sobra)],
		];
		const totalBarra = partes.reduce((s, [, v]) => s + v, 0) || 1;
		for (const [classe, valor] of partes) {
			const parte = criar("span", `bg-barra-parte bg-barra-${classe}`);
			parte.style.flexGrow = String(valor);
			barra.appendChild(parte);
		}
		p.corpo.appendChild(barra);

		const legenda = criar("div", "bg-orcamento-legenda");
		for (const [rotulo, valor, classe] of [
			["Preciso", preciso, "bg-barra-preciso"],
			["Quero", `${NUMERO.format(quero)} / ${NUMERO.format(cotaQuero)}`, "bg-barra-quero"],
			["Guardado", Math.max(0, sobra), "bg-barra-guardar"],
		]) {
			const item = criar("div", "bg-legenda-item");
			item.appendChild(criar("span", `bg-amostra ${classe}`));
			item.appendChild(criar("span", "bg-legenda-nome", rotulo));
			item.appendChild(
				criar("span", "bg-legenda-valor", typeof valor === "number" ? NUMERO.format(valor) : valor)
			);
			legenda.appendChild(item);
		}
		p.corpo.appendChild(legenda);
		p.corpo.appendChild(
			criar(
				"div",
				"bg-nota",
				`poupança ${Math.round(carteira.orcamento.poupanca * 100)}% da renda · cota de "quero" ${Math.round(carteira.orcamento.desejos * 100)}%`
			)
		);
		return p;
	}

	function montarCategorias() {
		const p = painel("Categorias", "bg-categorias");
		const tabela = criar("div", "bg-arvore");
		const cabecalho = criar("div", "bg-arvore-cabecalho");
		cabecalho.append(criar("span", "", "Nome"), criar("span", "", "Natureza"));
		tabela.appendChild(cabecalho);

		for (const mae of carteira.categorias) {
			const linha = criar("div", "bg-arvore-linha mae");
			const nome = criar("span", "bg-arvore-nome");
			nome.appendChild(ponto(mae.cor));
			nome.appendChild(criar("span", "", mae.nome));
			linha.append(nome, criar("span", "bg-arvore-natureza", mae.natureza));
			tabela.appendChild(linha);

			for (const filha of mae.filhas || []) {
				const sub = criar("div", "bg-arvore-linha");
				const nomeFilha = criar("span", "bg-arvore-nome filha");
				nomeFilha.style.borderLeftColor = `var(--clr-${mae.cor}-a30)`;
				nomeFilha.appendChild(criar("span", "", filha.nome));
				sub.append(nomeFilha, criar("span", "bg-arvore-natureza", filha.natureza));
				tabela.appendChild(sub);
			}
		}
		p.corpo.appendChild(tabela);
		return p;
	}

	function montarPessoas() {
		const p = painel("Pessoas");
		const tabela = criar("div", "bg-arvore");
		const cabecalho = criar("div", "bg-arvore-cabecalho");
		cabecalho.append(criar("span", "", "Nome"), criar("span", "", "Me deve"));
		tabela.appendChild(cabecalho);

		// O que cada um deve sai das divisões, não de um campo solto: assim nunca
		// diverge do que está lançado.
		const deve = new Map(carteira.pessoas.map((p2) => [p2.nome, 0]));
		for (const l of carteira.lancamentos) {
			for (const d of l.divisoes || []) {
				deve.set(d.pessoa, (deve.get(d.pessoa) || 0) + d.valor);
			}
		}
		for (const [nome, valor] of deve) {
			const linha = criar("div", "bg-arvore-linha");
			linha.append(
				criar("span", "bg-arvore-nome", nome),
				criar("span", valor > 0 ? "bg-sinal-mais" : "bg-arvore-natureza", NUMERO.format(valor))
			);
			tabela.appendChild(linha);
		}
		p.corpo.appendChild(tabela);
		return p;
	}

	/* ------------------------------------------------------------ formulário */

	function aplicarModelo(i) {
		const modelo = carteira.modelos[i];
		if (!modelo) return;
		salvarLancamento({
			valor: modelo.valor,
			categoria: modelo.categoria,
			descricao: modelo.nome,
			conta: modelo.conta,
			data: hoje(),
		});
	}

	function salvarLancamento(dados) {
		carteira.lancamentos.push({
			id: carteira.proximoId,
			divisoes: [],
			...dados,
		});
		carteira.proximoId += 1;
		carteira.ficticia = false;
		gravar(carteira);
		semana = inicioDaSemana(dados.data);
		selecionado = 0;
		desenhar();
	}

	function abrirFormulario() {
		formulario = {
			valor: "",
			categoria: achatarCategorias(carteira.categorias)[0]?.nome || "",
			descricao: "",
			conta: carteira.contas[0]?.nome || "",
		};
		desenhar();
	}

	function montarFormulario() {
		const fundo = criar("div", "bg-modal-fundo");
		const caixa = painel(tipo === "saida" ? "Nova saída" : "Nova entrada", "bg-modal");

		const campos = [
			["valor", "Valor", "texto"],
			["categoria", "Categoria", "lista"],
			["conta", "Conta", "contas"],
			["descricao", "Rótulo", "texto"],
		];

		const form = criar("form", "bg-form");
		for (const [chave, rotulo, tipoCampo] of campos) {
			const linha = criar("label", "bg-form-linha");
			linha.appendChild(criar("span", "bg-form-rotulo", rotulo));
			let campo;
			if (tipoCampo === "texto") {
				campo = document.createElement("input");
				campo.type = "text";
				campo.value = formulario[chave];
				if (chave === "valor") campo.placeholder = "25,90";
			} else {
				campo = document.createElement("select");
				const opcoes =
					tipoCampo === "lista"
						? achatarCategorias(carteira.categorias).map((c) => c.nome)
						: carteira.contas.map((c) => c.nome);
				for (const o of opcoes) {
					const op = document.createElement("option");
					op.value = o;
					op.textContent = o;
					campo.appendChild(op);
				}
				campo.value = formulario[chave];
			}
			campo.className = "bg-form-campo";
			campo.addEventListener("input", () => {
				formulario[chave] = campo.value;
			});
			linha.appendChild(campo);
			form.appendChild(linha);
		}

		const acoes = criar("div", "bg-form-acoes");
		const confirmar = criar("button", "bg-botao", "salvar");
		confirmar.type = "submit";
		const cancelar = criar("button", "bg-botao fantasma", "cancelar (esc)");
		cancelar.type = "button";
		cancelar.addEventListener("click", fecharFormulario);
		acoes.append(confirmar, cancelar);
		form.appendChild(acoes);

		form.addEventListener("submit", (evento) => {
			evento.preventDefault();
			const bruto = Math.abs(interpretarValor(formulario.valor));
			if (!Number.isFinite(bruto) || bruto === 0) return;
			salvarLancamento({
				valor: tipo === "saida" ? -bruto : bruto,
				categoria: formulario.categoria,
				descricao: formulario.descricao,
				conta: formulario.conta,
				data: hoje(),
			});
			formulario = null;
		});

		caixa.corpo.appendChild(form);
		fundo.appendChild(caixa);
		// Foca o primeiro campo no quadro seguinte, quando ele já está na árvore.
		requestAnimationFrame(() => fundo.querySelector("input")?.focus());
		return fundo;
	}

	function fecharFormulario() {
		formulario = null;
		desenhar();
	}

	function apagarSelecionado() {
		const lancamentos = daSemana();
		const alvo = lancamentos[selecionado];
		if (!alvo) return;
		carteira.lancamentos = carteira.lancamentos.filter((l) => l.id !== alvo.id);
		gravar(carteira);
		desenhar();
	}

	/* --------------------------------------------------------------- rodapé */

	function montarRodape() {
		const rodape = criar("footer", "bg-rodape");
		const teclas = formulario
			? [["esc", "fechar"], ["enter", "salvar"]]
			: [
					["a", "lançar"],
					["d", "apagar"],
					["1-9", "modelo"],
					["←→", "semana"],
					["↑↓", "selecionar"],
					["c", "trocar aba"],
					["q", "sair"],
				];
		for (const [tecla, acao] of teclas) {
			const item = criar("span", "bg-tecla-item");
			item.appendChild(criar("kbd", "bg-tecla", tecla));
			item.appendChild(criar("span", "", acao));
			rodape.appendChild(item);
		}
		return rodape;
	}

	/* -------------------------------------------------------------- desenho */

	function desenhar() {
		raiz.textContent = "";
		raiz.appendChild(montarTopo());

		const corpo = criar("div", `bg-corpo bg-corpo-${aba}`);
		if (aba === "home") {
			const esquerda = criar("div", "bg-coluna bg-coluna-esquerda");
			const cima = criar("div", "bg-dupla");
			cima.append(montarContas(), criar("div", "bg-pilha"));
			cima.lastChild.append(montarTipo(), montarPeriodo());
			esquerda.append(cima, montarInsights());

			const direita = criar("div", "bg-coluna bg-coluna-direita");
			direita.append(montarModelos(), montarRegistros());
			corpo.append(esquerda, direita);
		} else {
			const esquerda = criar("div", "bg-coluna bg-coluna-esquerda");
			esquerda.append(montarGrafico(), montarOrcamento());
			const direita = criar("div", "bg-coluna bg-coluna-direita");
			direita.append(montarCategorias(), montarPessoas());
			corpo.append(esquerda, direita);
		}
		raiz.appendChild(corpo);

		if (formulario) raiz.appendChild(montarFormulario());
		raiz.appendChild(montarRodape());
	}

	/* -------------------------------------------------------------- teclado */

	function noTeclado(evento) {
		if (formulario) {
			if (evento.key === "Escape") {
				evento.preventDefault();
				fecharFormulario();
			}
			// Dentro do formulário o teclado é do formulário: sem atalhos de letra,
			// senão não dá pra digitar "a" num rótulo.
			return;
		}

		const tecla = evento.key;
		if (tecla === "q" || tecla === "Escape") {
			evento.preventDefault();
			sair();
			return;
		}
		if (tecla === "c") {
			evento.preventDefault();
			aba = aba === "home" ? "manager" : "home";
			desenhar();
			return;
		}
		if (aba !== "home") return;

		if (tecla === "a") {
			evento.preventDefault();
			abrirFormulario();
		} else if (tecla === "d") {
			evento.preventDefault();
			apagarSelecionado();
		} else if (tecla === "ArrowLeft") {
			evento.preventDefault();
			semana = somarDias(semana, -7);
			desenhar();
		} else if (tecla === "ArrowRight") {
			evento.preventDefault();
			semana = somarDias(semana, 7);
			desenhar();
		} else if (tecla === "ArrowUp") {
			evento.preventDefault();
			selecionado = Math.max(0, selecionado - 1);
			desenhar();
		} else if (tecla === "ArrowDown") {
			evento.preventDefault();
			selecionado = Math.min(daSemana().length - 1, selecionado + 1);
			desenhar();
		} else if (/^[1-9]$/.test(tecla)) {
			evento.preventDefault();
			aplicarModelo(Number(tecla) - 1);
		}
	}

	function sair() {
		document.removeEventListener("keydown", noTeclado, true);
		document.body.classList.remove("bagels-aberto");
		raiz.remove();
		aoSair();
	}

	// Captura pra chegar antes do <input> do prompt, que continua focado atrás —
	// senão cada tecla de atalho também seria digitada na linha de comando.
	document.addEventListener("keydown", noTeclado, true);
	desenhar();
}
