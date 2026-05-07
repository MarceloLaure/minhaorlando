-- ============================================================
-- MEMBER PERMISSIONS — campos pra controlar quem edita o plano
-- + tipo (adulto/crianca) override manual
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Novos campos em family_members
alter table public.family_members
  add column if not exists can_edit_plan boolean default false;

-- is_child: null = derivar pela idade (age < 10), true/false = override manual
alter table public.family_members
  add column if not exists is_child boolean;

-- 2) RLS pra admins lerem/editarem todos os family_members via /acessadm
drop policy if exists "admins read all family_members" on public.family_members;
create policy "admins read all family_members"
  on public.family_members for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "admins update all family_members" on public.family_members;
create policy "admins update all family_members"
  on public.family_members for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- 3) Owner da familia (owner_email) sempre pode editar plano
-- Atualiza membros existentes que tem auth_user_id linkado ao owner
update public.family_members fm
  set can_edit_plan = true
  where exists (
    select 1 from public.allowed_users au
    join public.families f on f.id = fm.family_id
    where au.id = fm.auth_user_id
      and lower(au.email) = lower(f.owner_email)
  );
