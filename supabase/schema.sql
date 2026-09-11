-- Tabelas da /curriculo/. Cole isto no SQL Editor da Supabase e rode uma vez.
--
-- A ideia toda: as duas tabelas ficam com RLS ligada e SEM policy nenhuma.
-- Policy é o que libera acesso — não ter nenhuma significa que a chave pública
-- (anon/publishable) não lê nem escreve nada aqui. Só a Edge Function alcança,
-- porque ela usa a service_role, que passa por cima da RLS.
--
-- Ou seja: mesmo que alguém pegue a chave pública do site (ela é pública de
-- propósito), não consegue ler o currículo.

-- ---------------------------------------------------------------------------
-- O currículo: uma linha só, um jsonb.
-- ---------------------------------------------------------------------------
create table if not exists public.curriculo (
	-- O check trava a tabela em uma linha só. Evita a confusão de ter duas
	-- versões do currículo e a função pegar a errada.
	id smallint primary key default 1,
	dados jsonb not null,
	atualizado_em timestamptz not null default now(),
	constraint curriculo_uma_linha check (id = 1)
);

alter table public.curriculo enable row level security;

-- ---------------------------------------------------------------------------
-- Tentativas de senha, pro freio de força bruta.
-- ---------------------------------------------------------------------------
create table if not exists public.tentativas (
	id bigint generated always as identity primary key,
	-- Hash do IP, nunca o IP. Ver hashDoIp() na função.
	ip_hash text not null,
	criado_em timestamptz not null default now()
);

alter table public.tentativas enable row level security;

-- A função conta por ip_hash dentro de uma janela de tempo; sem este índice a
-- contagem vira varredura na tabela inteira a cada tentativa.
create index if not exists tentativas_busca
	on public.tentativas (ip_hash, criado_em desc);

-- ---------------------------------------------------------------------------
-- Limpeza
-- ---------------------------------------------------------------------------
-- A tabela de tentativas só cresce. Rodar isto de vez em quando resolve:
--
--   delete from public.tentativas where criado_em < now() - interval '1 day';
--
-- Pra automatizar, ligue a extensão pg_cron (Database > Extensions) e agende:
--
--   select cron.schedule(
--     'limpar-tentativas',
--     '0 4 * * *',
--     $$delete from public.tentativas where criado_em < now() - interval '1 day'$$
--   );

-- ---------------------------------------------------------------------------
-- Conferência: as duas tabelas devem aparecer com rls_habilitada = true e
-- politicas = 0. Se aparecer qualquer policy, o conteúdo está exposto.
-- ---------------------------------------------------------------------------
-- select
--   c.relname as tabela,
--   c.relrowsecurity as rls_habilitada,
--   (select count(*) from pg_policies p
--     where p.schemaname = 'public' and p.tablename = c.relname) as politicas
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relname in ('curriculo', 'tentativas');
