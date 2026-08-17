-- ============================================================
-- ACESSO LIVRE — login direto por email, sem link mágico
--
-- A pessoa digita o email e clica em "Acesso Livre". Se o email
-- estiver em allowed_users como 'active', entra na hora.
--
-- COMO FUNCIONA:
--   1. App chama a Edge Function acesso-livre com { email }
--   2. A função (service_role) confirma allowed_users.status='active'
--   3. Gera um token de magic link com generateLink() — SEM mandar email
--   4. Browser troca o token por sessão real em /auth/v1/verify
--
-- ⚠️  O QUE ISSO SIGNIFICA NA PRÁTICA
--   Email não é segredo. Quem souber o email de alguém da allowlist
--   entra na conta dessa pessoa: despesas, plano, família, tudo.
--   O link mágico existia justamente pra provar que a pessoa tem
--   acesso à caixa de entrada daquele email — o Acesso Livre remove
--   essa prova.
--
--   Pra desligar depois: delete a Edge Function 'acesso-livre'.
--   O botão no app passa a dar erro e o link mágico continua funcionando
--   normal (o fluxo antigo não foi tocado).
--
-- Rodar no Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 0) LIMPEZA — remove a tentativa anterior de "palavra-chave"
-- ============================================================
-- Se você chegou a rodar o magic_words.sql, isso apaga aquilo.
-- Se não rodou, não faz nada (o "if exists" cobre os dois casos).
drop table if exists public.magic_words cascade;
drop table if exists public.magic_word_attempts cascade;
drop function if exists public.magic_words_lower() cascade;

-- ============================================================
-- 1) RATE LIMIT — trava tentativa em massa
-- ============================================================
-- Não protege contra quem sabe o email certo (nada protege — é esse
-- o trade-off do Acesso Livre). Serve pra impedir que alguém fique
-- varrendo emails pra descobrir quem está na allowlist.
create table if not exists public.login_attempts (
  id       bigserial primary key,
  ip       text,
  email    text,
  ok       boolean not null,
  tried_at timestamptz not null default now()
);

create index if not exists login_attempts_ip_idx
  on public.login_attempts (ip, tried_at desc);

-- RLS ligado e sem policy nenhuma: só service_role (Edge Function) enxerga.
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

-- ============================================================
-- 2) CONFERIR QUEM VAI CONSEGUIR ENTRAR
-- ============================================================
-- Qualquer email desta lista entra digitando ele mesmo + Acesso Livre.
-- Se tiver alguém aqui que não deveria, mude o status pra 'paused'.
select name, email, role, status
from public.allowed_users
order by status, name;

-- ============================================================
-- 3) MANUTENÇÃO
-- ============================================================
-- Tirar o acesso de alguém (vale pro Acesso Livre E pro link mágico):
--   update public.allowed_users set status = 'paused' where email = 'fulano@email.com';
--
-- Ver quem entrou por Acesso Livre nas últimas 24h:
--   select email, ip, tried_at from public.login_attempts
--   where ok and tried_at > now() - interval '24 hours'
--   order by tried_at desc;
--
-- Ver tentativas com email fora da allowlist (varredura?):
--   select ip, count(*), max(tried_at) from public.login_attempts
--   where not ok and tried_at > now() - interval '24 hours'
--   group by ip order by 2 desc;
--
-- Limpar log antigo (roda de vez em quando, a tabela só cresce):
--   delete from public.login_attempts where tried_at < now() - interval '30 days';
