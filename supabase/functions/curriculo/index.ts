// Edge Function da /curriculo/ — a única parte deste projeto que NÃO roda no
// navegador, e é justamente esse o motivo dela existir.
//
// Todo código que chega ao navegador pertence ao visitante: senha em JS puro se
// resolve com F12 e um `if` apagado. Aqui a senha nunca sai do servidor, e o
// conteúdo do currículo só entra na resposta depois que ela bate.
//
// Roda na Supabase (Deno). Não é servida pela Vercel, não entra no site, não é
// dependência do front — o `.vercelignore` tira esta pasta do deploy estático.
//
// Variáveis de ambiente esperadas:
//   SENHA_CURRICULO  — a senha (supabase secrets set)
//   SAL_IP           — sal do hash de IP (supabase secrets set)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — a Supabase injeta sozinha

import { createClient } from "jsr:@supabase/supabase-js@2";

// De onde o navegador pode chamar. Origem fora desta lista não recebe o
// cabeçalho de CORS e o navegador corta a resposta.
const ORIGENS = new Set([
	"https://www.dharlan.world",
	"https://dharlan.world",
	"http://localhost:4173",
	"http://localhost:3000",
]);

const JANELA_MINUTOS = 15;
const MAX_TENTATIVAS = 8;
const VALIDADE_PDF = 60; // segundos
const ATRASO_MS = 400;

function cabecalhos(origem: string | null): HeadersInit {
	const permitida = origem && ORIGENS.has(origem) ? origem : "https://www.dharlan.world";
	return {
		"Access-Control-Allow-Origin": permitida,
		"Access-Control-Allow-Headers": "content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		// Sem isto, um cache no meio do caminho pode servir a resposta de uma
		// origem para outra.
		Vary: "Origin",
		"Content-Type": "application/json",
	};
}

// Guarda o hash, nunca o IP cru: IP é dado pessoal e aqui ele só precisa servir
// de chave de contagem. O sal impede que alguém com a tabela na mão descubra
// os IPs testando os 4 bilhões possíveis.
async function hashDoIp(ip: string): Promise<string> {
	const sal = Deno.env.get("SAL_IP") ?? "";
	const bytes = new TextEncoder().encode(sal + "|" + ip);
	const resumo = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(resumo)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Comparação sem sair no primeiro caractere diferente. O tamanho ainda vaza,
// mas o conteúdo não dá pra adivinhar caractere a caractere pelo tempo.
function iguais(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diferenca = 0;
	for (let i = 0; i < a.length; i++) {
		diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diferenca === 0;
}

function responder(corpo: unknown, status: number, cab: HeadersInit) {
	return new Response(JSON.stringify(corpo), { status, headers: cab });
}

Deno.serve(async (req) => {
	const cab = cabecalhos(req.headers.get("origin"));

	if (req.method === "OPTIONS") return new Response("ok", { headers: cab });
	if (req.method !== "POST") return responder({ erro: "metodo" }, 405, cab);

	const db = createClient(
		Deno.env.get("SUPABASE_URL")!,
		// Esta chave passa por cima da RLS. Ela existe só aqui dentro — se for
		// parar no front, todo o resto vira enfeite.
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	);

	// --- freio de força bruta -------------------------------------------------
	// Sem isto a senha não vale nada: um script testa milhares por minuto e a
	// função responde alegremente a todas.
	const ip =
		(req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
	const chave = await hashDoIp(ip);
	const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();

	const { count } = await db
		.from("tentativas")
		.select("*", { count: "exact", head: true })
		.eq("ip_hash", chave)
		.gte("criado_em", desde);

	// Registra antes de comparar, e registra sempre — inclusive a tentativa
	// certa. Contar só os erros deixaria a porta aberta pra quem acerta.
	await db.from("tentativas").insert({ ip_hash: chave });

	if ((count ?? 0) >= MAX_TENTATIVAS) {
		return responder({ erro: "bloqueado" }, 429, cab);
	}

	// --- senha ----------------------------------------------------------------
	let senha = "";
	try {
		const corpo = await req.json();
		if (typeof corpo?.senha === "string") senha = corpo.senha;
	} catch {
		// corpo inválido segue e cai no 401 genérico abaixo
	}

	// Atraso fixo. Ajuda contra tentativa em sequência, mas NÃO substitui a
	// contagem acima: atraso não segura requisições em paralelo.
	await new Promise((r) => setTimeout(r, ATRASO_MS));

	const esperada = Deno.env.get("SENHA_CURRICULO");
	if (!esperada || !iguais(senha, esperada)) {
		// Resposta genérica: não distingue "senha errada" de "senha vazia" nem
		// de "segredo não configurado".
		return responder({ erro: "negado" }, 401, cab);
	}

	// --- currículo ------------------------------------------------------------
	const { data: linha, error } = await db
		.from("curriculo")
		.select("dados")
		.eq("id", 1)
		.single();

	if (error || !linha) {
		console.error("curriculo: falha ao ler a tabela —", error);
		return responder({ erro: "indisponivel" }, 500, cab);
	}

	// URL assinada de 60s. É compartilhável enquanto vale — por isso vale pouco.
	// Não estender "por conveniência".
	const { data: assinada, error: erroPdf } = await db.storage
		.from("curriculo")
		.createSignedUrl("curriculo.pdf", VALIDADE_PDF);

	if (erroPdf) console.error("curriculo: falha ao assinar o PDF —", erroPdf);

	return responder(
		{ dados: linha.dados, pdfUrl: assinada?.signedUrl ?? null },
		200,
		cab,
	);
});
