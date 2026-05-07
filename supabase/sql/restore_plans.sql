-- ============================================================
-- Restaura plano vitalicio + invite_code pras familias que ficaram
-- sem plan (consequencia do merge bagunçado)
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Pra cada familia sem plan, encontra o owner_email correto
-- (membro com auth_user_id linkado a allowed_users)
do $$
declare
  f record;
  owner_em text;
  invite text;
begin
  for f in
    select id, name from public.families where plan is null
  loop
    -- Acha email do owner: primeiro membro com auth_user_id
    select au.email into owner_em
    from public.family_members fm
    join public.allowed_users au on au.id = fm.auth_user_id
    where fm.family_id = f.id
    order by fm.created_at asc
    limit 1;

    -- Gera invite_code unico se nao tem
    invite := public.generate_invite_code();
    while exists (select 1 from public.families where invite_code = invite) loop
      invite := public.generate_invite_code();
    end loop;

    -- Atualiza familia
    update public.families
      set plan = 'family_12m',
          paid_at = now(),
          access_until = '2099-12-31',
          status = 'active',
          owner_email = coalesce(lower(owner_em), owner_email),
          invite_code = coalesce(invite_code, invite)
      where id = f.id;

    raise notice 'Restaurado plano em % (owner=%)', f.name, owner_em;
  end loop;
end $$;

-- 2) Mostra o resultado
select
  f.name,
  f.owner_email,
  f.plan,
  f.status,
  f.access_until,
  f.invite_code
from public.families f
order by f.name;
