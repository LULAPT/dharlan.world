// setup-bagels-dados.js — o cofre do bagels: formato, leitura, gravação e a
// semente de dados fictícios.
//
// Separado do TUI e dos comandos de propósito: estes três arquivos têm ritmos
// diferentes de mudança, e quem for ligar isto num back-end um dia (a Supabase
// da /curriculo/ é o caminho pronto) só precisa trocar `ler` e `gravar`.
//
// **Sem back-end, de propósito.** O Bagels também é local-first — guarda num
// SQLite na máquina de quem usa. O equivalente honesto no navegador é o
// localStorage. Consequências, pra ninguém se surpreender depois:
//
//   - os dados ficam num navegador só, não acompanham ninguém pro celular;
//   - limpar os dados do site apaga tudo — daí `export` e `import` existirem;
//   - quem abrir a /setup/ vê o cofre dele, não o do dono.

export const CHAVE = "bagels-dados";
const VERSAO = 2;

export const MOEDA = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

// Só o número, pras tabelas do TUI onde o "R$" repetido em toda linha vira
// ruído — é assim que o Bagels mostra também.
export const NUMERO = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function carteiraVazia() {
	return {
		versao: VERSAO,
		contas: [],
		categorias: [],
		modelos: [],
		pessoas: [],
		lancamentos: [],
		orcamento: { poupanca: 0.1, desejos: 0.4 },
		meta: null,
		proximoId: 1,
	};
}

/* --------------------------------------------------------------- categorias */

// As cores são nomes de família do variaveis.css (--clr-<nome>-a30), não hex:
// assim a paleta inteira acompanha a troca de tema, como o resto do site.
const CATEGORIAS_SEMENTE = [
	{
		nome: "Alimentação",
		natureza: "preciso",
		cor: "orange",
		filhas: [
			{ nome: "Mercado", natureza: "preciso" },
			{ nome: "Restaurante", natureza: "preciso" },
			{ nome: "Delivery", natureza: "quero" },
			{ nome: "Besteira", natureza: "quero" },
		],
	},
	{
		nome: "Transporte",
		natureza: "preciso",
		cor: "main",
		filhas: [
			{ nome: "Ônibus", natureza: "preciso" },
			{ nome: "Uber", natureza: "quero" },
		],
	},
	{
		nome: "Compras",
		natureza: "quero",
		cor: "cyan",
		filhas: [
			{ nome: "Roupa", natureza: "preciso" },
			{ nome: "Eletrônicos", natureza: "quero" },
			{ nome: "Figuras", natureza: "quero" },
			{ nome: "Presentes", natureza: "quero" },
		],
	},
	{
		nome: "Casa",
		natureza: "preciso",
		cor: "blue",
		filhas: [
			{ nome: "Aluguel", natureza: "preciso" },
			{ nome: "Internet", natureza: "preciso" },
			{ nome: "Streaming", natureza: "quero" },
		],
	},
	{
		nome: "Renda",
		natureza: "preciso",
		cor: "green",
		filhas: [{ nome: "Freela", natureza: "preciso" }],
	},
];

// Lista achatada pra busca: o TUI e os comandos procuram categoria por nome sem
// se importar se é mãe ou filha.
export function achatarCategorias(categorias) {
	const saida = [];
	for (const mae of categorias) {
		saida.push({ ...mae, mae: null });
		for (const filha of mae.filhas || []) {
			saida.push({ ...filha, cor: mae.cor, mae: mae.nome });
		}
	}
	return saida;
}

export function acharCategoria(carteira, nome) {
	const alvo = String(nome || "").toLowerCase();
	return achatarCategorias(carteira.categorias).find(
		(c) => c.nome.toLowerCase() === alvo
	);
}

export function corDaCategoria(carteira, nome) {
	return acharCategoria(carteira, nome)?.cor || "gray";
}

/* ------------------------------------------------------------------ semente */

function diasAtras(n) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	const mes = String(d.getMonth() + 1).padStart(2, "0");
	const dia = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${mes}-${dia}`;
}

// Fictícia de propósito, e dita isso na cara do usuário no rodapé do TUI. Serve
// pra a tela nascer com forma — um TUI de orçamento vazio não mostra nada do
// que ele é. Some inteira no primeiro `bagels reset`.
export function semente() {
	const c = carteiraVazia();
	c.ficticia = true;
	c.contas = [
		{ id: 1, nome: "Banco", saldo: 4924.5 },
		{ id: 2, nome: "Cartão", saldo: 80 },
	];
	c.categorias = CATEGORIAS_SEMENTE;
	c.modelos = [
		{ nome: "Casa→Facul", valor: -10, categoria: "Ônibus", conta: "Cartão" },
		{ nome: "Aluguel", valor: -1200, categoria: "Aluguel", conta: "Banco" },
		{ nome: "Netflix", valor: -44.9, categoria: "Streaming", conta: "Banco" },
	];
	// Sem campo "deve": quem deve o quê é somado das divisões dos lançamentos,
	// no TUI. Guardar o número aqui também daria duas versões da mesma verdade.
	c.pessoas = [{ nome: "Sarah" }, { nome: "Pai" }, { nome: "João" }];

	const lancamentos = [
		[0, 2500, "Freela", "Pagamento do mês", "Banco"],
		[0, -50, "Restaurante", "Janta com a Sarah", "Banco", [["Sarah", 25]]],
		[0, -1200, "Aluguel", "Aluguel do mês", "Banco"],
		[1, -10, "Ônibus", "Facul → Casa", "Cartão"],
		[1, -35, "Restaurante", "Almoço com o João", "Banco", [["João", 20]]],
		[1, -10, "Ônibus", "Casa → Facul", "Cartão"],
		[1, -2.5, "Besteira", "Pão de queijo", "Banco"],
		[2, -149.9, "Figuras", "Morrigan Kotobukiya", "Cartão"],
		[3, -62, "Uber", "Volta da madrugada", "Cartão"],
		[4, -89.9, "Mercado", "Compra da semana", "Banco"],
		[5, -44.9, "Streaming", "Netflix", "Banco"],
		[6, -25.9, "Delivery", "Pastel de feira", "Cartão"],
		[8, -120, "Roupa", "Camiseta nova", "Cartão"],
		[9, -99, "Internet", "Fibra", "Banco"],
		[11, 450, "Freela", "Identidade visual", "Banco"],
		[12, -18, "Mercado", "Café e pão", "Banco"],
		[14, -230, "Eletrônicos", "Teclado", "Cartão"],
	];

	c.lancamentos = lancamentos.map(([atras, valor, categoria, rotulo, conta, divisoes], i) => ({
		id: i + 1,
		data: diasAtras(atras),
		valor,
		categoria,
		descricao: rotulo,
		conta,
		divisoes: (divisoes || []).map(([pessoa, v]) => ({ pessoa, valor: v })),
	}));
	c.proximoId = c.lancamentos.length + 1;
	c.meta = 2500;
	return c;
}

/* ------------------------------------------------------------- persistência */

export function ler() {
	// Mesma postura do resto do site: se falhar, a página continua de pé. Em aba
	// anônima ou com dados de site bloqueados, o localStorage joga exceção já no
	// acesso, não só na escrita.
	try {
		const bruto = localStorage.getItem(CHAVE);
		if (!bruto) {
			const nova = semente();
			gravar(nova);
			return nova;
		}
		const dados = JSON.parse(bruto);
		if (!Array.isArray(dados.lancamentos)) return semente();
		return { ...carteiraVazia(), ...dados };
	} catch (erro) {
		console.error("setup-bagels-dados.js:", erro.message);
		return semente();
	}
}

export function gravar(carteira) {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(carteira));
		return true;
	} catch (erro) {
		console.error("setup-bagels-dados.js:", erro.message);
		return false;
	}
}

/* ------------------------------------------------------------------ formato */

// Aceita "12,90", "12.90", "R$ 1.234,56" e o sinal na frente. O par ponto+vírgula
// decide quem é milhar e quem é decimal; só vírgula é sempre decimal, que é como
// se digita em pt-BR.
export function interpretarValor(texto) {
	if (!texto) return NaN;
	let t = String(texto).replace(/r\$/i, "").replace(/\s/g, "");
	if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
	else if (t.includes(",")) t = t.replace(",", ".");
	return Number.parseFloat(t);
}

export function hoje() {
	return comoISO(new Date());
}

export function comoISO(d) {
	const mes = String(d.getMonth() + 1).padStart(2, "0");
	const dia = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${mes}-${dia}`;
}

export function mesDe(data) {
	return String(data).slice(0, 7);
}

export function mesAtual() {
	return mesDe(hoje());
}

export function ehMes(texto) {
	return /^\d{4}-\d{2}$/.test(texto);
}

export function ehData(texto) {
	return /^\d{4}-\d{2}-\d{2}$/.test(texto);
}

export function somar(lancamentos) {
	let entrou = 0;
	let saiu = 0;
	for (const l of lancamentos) {
		if (l.valor >= 0) entrou += l.valor;
		else saiu += -l.valor;
	}
	return { entrou, saiu, saldo: entrou - saiu };
}

// Quanto do lançamento é de fato meu: o que os outros devem sai da conta. É o
// "Self total" das linhas divididas do Bagels.
export function valorProprio(lancamento) {
	const dosOutros = (lancamento.divisoes || []).reduce((s, d) => s + d.valor, 0);
	return lancamento.valor < 0 ? lancamento.valor + dosOutros : lancamento.valor;
}
