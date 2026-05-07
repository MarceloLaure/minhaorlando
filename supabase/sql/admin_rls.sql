-- ============================================================
-- RLS pra admins lerem dados via /acessadm
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) WAITLIST — admins ativos podem ler
drop policy if exists "admins read waitlist" on public.waitlist;
create policy "admins read waitlist"
  on public.waitlist for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users
      where email = lower(auth.jwt() ->> 'email')
        and role = 'admin'
        and status = 'active'
    )
  );

-- Garante que SELECT esta liberado pra authenticated (RLS controla quem ve)
grant select on public.waitlist to authenticated;

-- 2) KIWIFY_ORDERS — admins ativos podem ler (era bloqueado pra todos)
drop policy if exists "admins read orders" on public.kiwify_orders;
create policy "admins read orders"
  on public.kiwify_orders for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users
      where email = lower(auth.jwt() ->> 'email')
        and role = 'admin'
        and status = 'active'
    )
  );

grant select on public.kiwify_orders to authenticated;

-- 3) FAMILIES — admins veem todas (sem essa policy, so via service_role)
-- Mantem a policy default (membros veem so a propria) e adiciona admin
drop policy if exists "admins read all families" on public.families;
create policy "admins read all families"
  on public.families for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users
      where email = lower(auth.jwt() ->> 'email')
        and role = 'admin'
        and status = 'active'
    )
  );

-- 4) FAMILY_LINKS — admins veem todos
drop policy if exists "admins read all family_links" on public.family_links;
create policy "admins read all family_links"
  on public.family_links for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users
      where email = lower(auth.jwt() ->> 'email')
        and role = 'admin'
        and status = 'active'
    )
  );

-- 5) ALLOWED_USERS — todo authenticated precisa ler a propria linha
-- (pra checkAuth do acessadm validar role=admin)
drop policy if exists "user reads own row" on public.allowed_users;
create policy "user reads own row"
  on public.allowed_users for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- E admins veem todos os allowed_users
drop policy if exists "admins read all allowed_users" on public.allowed_users;
create policy "admins read all allowed_users"
  on public.allowed_users for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users au
      where au.email = lower(auth.jwt() ->> 'email')
        and au.role = 'admin'
        and au.status = 'active'
    )
  );

-- ATENCAO: a policy 'user reads own row' tambem precisa funcionar
-- ANTES do user estar logado a primeira vez? Nao — anon ainda usa
-- a policy publica de SELECT (ou nenhuma). authenticated entra apenas
-- depois do magic link. checkAuth roda DEPOIS do session valido.

-- 6) RPC pra checar SE um email e admin (chamavel por anon, nao vaza a lista)
-- Usado pelo /acessadm pre-validar antes de mandar magic link
create or replace function public.is_admin_email(p_email text) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(p_email)
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.is_admin_email(text) to anon, authenticated;
