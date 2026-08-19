-- ============================================================
-- FIX RLS DE DESPESAS
--
-- SINTOMA: lançar despesa dava
--   REST POST [403] code 42501
--   "new row violates row-level security policy for table expenses"
--
-- CAUSA: a policy de INSERT era  with check (auth.uid() = paid_by).
--   auth.uid()  = id do usuário no Supabase Auth (auth.users.id)
--   paid_by     = id do MEMBRO da família (family_members.id)
--   São UUIDs de tabelas diferentes — a comparação nunca dava certo,
--   então TODO insert era recusado.
--
--   A policy confundia "quem pagou" com "quem lançou". São coisas
--   diferentes: a Priscilla pode lançar um gasto que o Danilo pagou,
--   ou um gasto da Melissa (5 anos, que nem login tem).
--
-- O QUE ESSE SCRIPT FAZ:
--   1. Cria created_by (identidade de quem lançou), preenchido
--      sozinho pelo Postgres — o app não precisa mandar nada
--   2. Troca as policies de INSERT/UPDATE pra checar "é um usuário
--      ativo da allowlist" em vez de comparar com paid_by
--   3. Cria a policy de DELETE, que simplesmente não existia
--
-- MODELO DE CONFIANÇA: qualquer pessoa ativa em allowed_users pode
--   lançar, editar e excluir despesa. É proposital — numa viagem em
--   grupo alguém lança o gasto do outro o tempo todo, e o toque em
--   "paguei minha parte" edita uma despesa criada por terceiro.
--   Se um dia quiser apertar, o caminho é trocar o using() do UPDATE
--   e do DELETE por (created_by = auth.uid()).
--
-- Rodar no Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1) COLUNA created_by
-- ============================================================
-- Em dois passos de propósito: "add column with default" faria o
-- Postgres avaliar auth.uid() UMA vez e carimbar esse valor em todas
-- as linhas antigas (no SQL Editor, seria o SEU id ou NULL). Assim as
-- linhas antigas ficam NULL e o default só vale pros inserts novos.
alter table public.expenses add column if not exists created_by uuid;
alter table public.expenses alter column created_by set default auth.uid();

-- ============================================================
-- 2) HELPER — está na allowlist e ativo?
-- ============================================================
-- security definer pra poder ler allowed_users sem depender do RLS dela.
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
      and status = 'active'
  );
$$;

grant execute on function public.is_active_user() to authenticated;

-- ============================================================
-- 3) POLICIES
-- ============================================================
-- INSERT — era (auth.uid() = paid_by), que nunca casava
drop policy if exists "auth insert expenses" on public.expenses;
drop policy if exists "expenses insert" on public.expenses;
create policy "expenses insert"
  on public.expenses for insert
  to authenticated
  with check (public.is_active_user());

-- UPDATE — era (auth.uid() = paid_by). Precisa ser mais largo que
-- "só quem criou": o botão "paguei minha parte" edita split_paid_by
-- de uma despesa lançada por outra pessoa.
drop policy if exists "auth update own expenses" on public.expenses;
drop policy if exists "expenses update" on public.expenses;
create policy "expenses update"
  on public.expenses for update
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- DELETE — não existia policy nenhuma, então excluir sempre falhava
drop policy if exists "expenses delete" on public.expenses;
create policy "expenses delete"
  on public.expenses for delete
  to authenticated
  using (public.is_active_user());

grant select, insert, update, delete on public.expenses to authenticated;

-- ============================================================
-- 4) CONFERIR
-- ============================================================
-- Depois de rodar, o esperado é:
--   expenses insert  INSERT  with_check = is_active_user()
--   expenses update  UPDATE  qual + with_check = is_active_user()
--   expenses delete  DELETE  qual = is_active_user()
--   (as duas policies de SELECT continuam como estavam)
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'expenses'
order by cmd, policyname;

-- ============================================================
-- 5) PENDENTE — leitura está frouxa demais
-- ============================================================
-- Existem DUAS policies de SELECT, e policies se somam (OR):
--   "all auth read expenses"  ->  auth.role() = 'authenticated'
--   "expenses read"           ->  checa allowed_users
--
-- A primeira anula a segunda: QUALQUER usuário autenticado lê TODAS as
-- despesas de TODAS as famílias — inclusive as marcadas como
-- "🔒 Pessoal (só sua família)", que hoje é só um rótulo na tela.
--
-- Não mexi porque a leitura funciona hoje e derrubar a policy errada
-- cega o app inteiro. Pra apertar (rode e teste a listagem logo depois):
--
--   drop policy if exists "all auth read expenses" on public.expenses;
--
-- Se a lista de despesas sumir, recria com:
--   create policy "all auth read expenses" on public.expenses
--     for select to public using (auth.role() = 'authenticated');
