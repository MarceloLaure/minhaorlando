-- ============================================================
-- Admin: liberar DELETE de familias e family_links + INSERT em links
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) FAMILIES — admins podem DELETE
drop policy if exists "admins delete families" on public.families;
create policy "admins delete families"
  on public.families for delete
  to authenticated
  using (public.current_user_is_admin());

-- 2) FAMILY_LINKS — admins podem INSERT, UPDATE e DELETE manualmente
drop policy if exists "admins insert family_links" on public.family_links;
create policy "admins insert family_links"
  on public.family_links for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "admins delete family_links" on public.family_links;
create policy "admins delete family_links"
  on public.family_links for delete
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "admins update family_links" on public.family_links;
create policy "admins update family_links"
  on public.family_links for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
