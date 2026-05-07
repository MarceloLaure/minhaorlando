-- ============================================================
-- RECOVERY: desfaz danos de re-rodar seed_lifetime.sql
--
-- Problema: seed_lifetime.sql cria 1 familia por allowed_user, mesmo
-- quando o user ja estava como membro de outra familia. Isso recria
-- as familias-fantasma que voce mesclou anteriormente.
--
-- Esse script:
-- 1. Detecta allowed_users cujo family_id aponta pra familia VAZIA
--    com owner_email = email deles (= ghost recriado pelo seed)
-- 2. Acha a familia REAL onde o user e membro (via family_members.auth_user_id)
-- 3. Aponta allowed_users.family_id pra familia real
-- 4. Deleta a familia ghost
--
-- Tambem move family_links + kiwify_orders + invite_code pra preservar
-- dados se a ghost tinha plano vitalicio.
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

do $$
declare
  u record;
  real_family_id uuid;
  ghost_invite text;
  ghost_plan text;
  ghost_paid_at timestamptz;
  ghost_access_until date;
begin
  -- Pra cada allowed_user, checa se a familia atual eh ghost
  for u in
    select au.id as user_id,
           au.email as user_email,
           au.family_id as ghost_family_id,
           f.owner_email,
           f.name as ghost_name,
           f.plan,
           f.invite_code,
           f.paid_at,
           f.access_until
    from public.allowed_users au
    join public.families f on f.id = au.family_id
    where lower(f.owner_email) = lower(au.email)
      and not exists (
        select 1 from public.family_members fm where fm.family_id = f.id
      )
  loop
    -- Acha familia REAL (onde user esta como membro via auth_user_id)
    select fm.family_id into real_family_id
    from public.family_members fm
    where fm.auth_user_id = u.user_id
      and fm.family_id != u.ghost_family_id
    limit 1;

    if real_family_id is not null then
      -- Salva metadados da ghost
      ghost_invite := u.invite_code;
      ghost_plan := u.plan;
      ghost_paid_at := u.paid_at;
      ghost_access_until := u.access_until;

      -- Limpa invite_code da ghost ANTES de deletar (pra liberar o codigo)
      update public.families set invite_code = null where id = u.ghost_family_id;

      -- Aponta allowed_user pra familia real
      update public.allowed_users
        set family_id = real_family_id, status = 'active'
        where id = u.user_id;

      -- Move qualquer family_link onde ghost aparece
      update public.family_links set owner_family_id = real_family_id where owner_family_id = u.ghost_family_id;
      update public.family_links set guest_family_id = real_family_id where guest_family_id = u.ghost_family_id;

      -- Move kiwify_orders apontando pra ghost
      update public.kiwify_orders set family_id = real_family_id where family_id = u.ghost_family_id;

      -- Deleta a ghost
      delete from public.families where id = u.ghost_family_id;

      raise notice 'Movido user % de ghost % pra real %', u.user_email, u.ghost_name, real_family_id;
    end if;
  end loop;
end $$;

-- Mostra estado final
select
  au.email,
  f.name as familia_atual,
  f.owner_email,
  f.plan,
  (select count(*) from public.family_members fm where fm.family_id = f.id) as qtd_membros
from public.allowed_users au
left join public.families f on f.id = au.family_id
order by au.email;
