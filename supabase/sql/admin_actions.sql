-- ============================================================
-- Permite admins EDITAR (UPDATE) families e allowed_users
-- Necessario pros botoes do /acessadm: Estender / Revogar
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) FAMILIES — admins podem UPDATE (estender access_until, mudar status)
drop policy if exists "admins update families" on public.families;
create policy "admins update families"
  on public.families for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- 2) ALLOWED_USERS — admins podem UPDATE (pausar usuarios revogados)
drop policy if exists "admins update allowed_users" on public.allowed_users;
create policy "admins update allowed_users"
  on public.allowed_users for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
