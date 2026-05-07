-- ============================================================
-- FIX: substitui exists() recursivo por security definer function
-- O bug anterior fazia: policy do waitlist consultava allowed_users,
-- que tinha policy 'admins read all' que consultava allowed_users de novo.
-- Resultado: recursao + erro 500.
--
-- Solucao: funcao current_user_is_admin() rodando como security definer
-- (bypassa RLS durante a checagem). Sem recursao.
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Funcao helper: checa se o usuario logado e admin
create or replace function public.current_user_is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

-- 2) Re-cria todas as policies usando a funcao (sem recursao)

-- WAITLIST
drop policy if exists "admins read waitlist" on public.waitlist;
create policy "admins read waitlist"
  on public.waitlist for select
  to authenticated
  using (public.current_user_is_admin());

-- KIWIFY_ORDERS
drop policy if exists "admins read orders" on public.kiwify_orders;
create policy "admins read orders"
  on public.kiwify_orders for select
  to authenticated
  using (public.current_user_is_admin());

-- FAMILIES
drop policy if exists "admins read all families" on public.families;
create policy "admins read all families"
  on public.families for select
  to authenticated
  using (public.current_user_is_admin());

-- FAMILY_LINKS
drop policy if exists "admins read all family_links" on public.family_links;
create policy "admins read all family_links"
  on public.family_links for select
  to authenticated
  using (public.current_user_is_admin());

-- ALLOWED_USERS — ESSA E A CRITICA (era a recursiva)
drop policy if exists "admins read all allowed_users" on public.allowed_users;
create policy "admins read all allowed_users"
  on public.allowed_users for select
  to authenticated
  using (public.current_user_is_admin());

-- A policy "user reads own row" continua igual (nao depende de funcao)
-- E ja existe do admin_rls.sql:
--   create policy "user reads own row"
--     on public.allowed_users for select
--     to authenticated
--     using (lower(email) = lower(auth.jwt() ->> 'email'));
