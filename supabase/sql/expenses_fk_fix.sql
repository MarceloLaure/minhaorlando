-- ============================================================
-- FIX FOREIGN KEY DE DESPESAS  (rodar DEPOIS do expenses_rls_fix.sql)
--
-- SINTOMA: depois de corrigir o RLS, lançar despesa passou a dar
--   REST POST [409] code 23503
--   "insert or update on table expenses violates foreign key
--    constraint expenses_paid_by_fkey — Key is not present in
--    table users"
--
-- CAUSA: expenses.paid_by tem FK pra auth.users(id), ou seja o banco
--   exige que "quem pagou" seja uma CONTA DE LOGIN. Mas o app manda
--   family_members.id — e membro não é conta: Melissa (5 anos),
--   Enrico (1 ano) e Stellinha aparecem no seletor "Quem pagou" e não
--   têm login nenhum.
--
--   Mesma causa raiz do RLS: o schema foi feito quando paid_by era o
--   usuário logado. O app passou a tratar paid_by como "qual membro
--   da família pagou", e a constraint ficou pra trás.
--
-- O QUE ESSE SCRIPT FAZ:
--   1. Mostra o estrago atual (quantas linhas antigas quebram)
--   2. Preserva o nome de quem pagou nas linhas antigas antes de
--      soltar o id (não perde informação)
--   3. Repontua a FK pra family_members, que é o que o app usa
--
-- Rodar no Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1) DIAGNÓSTICO — rode primeiro e olhe o resultado
-- ============================================================
-- Quantas despesas já existem, e quantas têm paid_by que NÃO é um
-- membro de família válido (essas são as que o passo 3 vai tratar).
select
  count(*)                                                        as total_despesas,
  count(*) filter (where paid_by is not null)                     as com_paid_by,
  count(*) filter (
    where paid_by is not null
      and not exists (select 1 from public.family_members fm where fm.id = expenses.paid_by)
  )                                                                as paid_by_invalido
from public.expenses;

-- ============================================================
-- 2) PRESERVA O NOME antes de soltar o id
-- ============================================================
-- Linhas antigas têm paid_by = auth.users.id. Esse id vai deixar de
-- ser válido, então antes de zerar a gente tenta descobrir o nome da
-- pessoa (auth.users -> allowed_users) e guarda em paid_by_external,
-- que é o campo de "pessoa de fora" que a tela já sabe mostrar.
update public.expenses e
set
  paid_by_external = coalesce(
    nullif(e.paid_by_external, ''),
    (
      select au.name
      from auth.users u
      join public.allowed_users au on lower(au.email) = lower(u.email)
      where u.id = e.paid_by
      limit 1
    ),
    'Pagador antigo'
  ),
  paid_by = null
where e.paid_by is not null
  and not exists (
    select 1 from public.family_members fm where fm.id = e.paid_by
  );

-- ============================================================
-- 3) REPONTUA A FK
-- ============================================================
alter table public.expenses drop constraint if exists expenses_paid_by_fkey;

-- on delete set null: se um membro for removido da família, a despesa
-- não some junto — só perde o vínculo e passa a mostrar "Externo".
alter table public.expenses
  add constraint expenses_paid_by_fkey
  foreign key (paid_by) references public.family_members(id)
  on delete set null;

-- ============================================================
-- 4) CONFERIR
-- ============================================================
-- Esperado: expenses_paid_by_fkey -> family_members(id)
select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema || '.' || ccu.table_name as aponta_para,
  ccu.column_name                            as coluna_destino,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'expenses'
  and tc.constraint_type = 'FOREIGN KEY';

-- ============================================================
-- 5) SE AINDA DER ERRO DE FK EM OUTRA COLUNA
-- ============================================================
-- split_among e split_paid_by são arrays de family_members.id e
-- normalmente não têm FK (Postgres não faz FK de array direto). Se
-- aparecer erro citando outra constraint, a query do passo 4 lista
-- todas as FKs da tabela — me manda o resultado dela.
