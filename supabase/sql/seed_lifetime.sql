-- ============================================================
-- SEED: cria familias 'vitalicias' pros emails ja em allowed_users
-- Util pra testar o fluxo de assinatura sem precisar pagar de verdade.
--
-- O que faz:
-- 1. Pra cada email em allowed_users, cria uma familia (se nao tiver)
-- 2. Marca como plan='family_12m', status='active'
-- 3. access_until = 2099-12-31 (vitalicio na pratica)
-- 4. Gera invite_code unico
-- 5. Vincula allowed_users.family_id -> a familia criada
--
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Pra cada allowed_user que ainda nao tem familia, cria uma
do $$
declare
  u record;
  fam_id uuid;
  invite text;
  first_name text;
begin
  for u in
    select id, name, email
    from public.allowed_users
    where family_id is null
       or family_id not in (select id from public.families where owner_email = lower(allowed_users.email))
  loop
    -- Verifica se ja existe familia pra esse owner_email
    select id into fam_id from public.families where owner_email = lower(u.email) limit 1;

    if fam_id is null then
      -- Cria nova
      first_name := coalesce(split_part(u.name, ' ', 1), 'Família');
      invite := public.generate_invite_code();
      -- Garante unicidade do invite_code
      while exists (select 1 from public.families where invite_code = invite) loop
        invite := public.generate_invite_code();
      end loop;

      insert into public.families (
        name, owner_email, plan, paid_at, access_until, status, invite_code
      ) values (
        'Família ' || first_name,
        lower(u.email),
        'family_12m',
        now(),
        '2099-12-31',
        'active',
        invite
      ) returning id into fam_id;

      raise notice 'Criada familia % pra % (invite=%)', fam_id, u.email, invite;
    else
      -- Atualiza familia existente pra vitalicia
      update public.families
        set plan = coalesce(plan, 'family_12m'),
            paid_at = coalesce(paid_at, now()),
            access_until = greatest(coalesce(access_until, current_date), date '2099-12-31'),
            status = 'active',
            invite_code = coalesce(invite_code, public.generate_invite_code())
        where id = fam_id;

      raise notice 'Atualizada familia % pra vitalicia (%)', fam_id, u.email;
    end if;

    -- Vincula allowed_user a familia (se ainda nao estiver)
    update public.allowed_users
      set family_id = fam_id, status = 'active'
      where id = u.id;
  end loop;
end $$;

-- 2) Mostra o resultado
select
  f.name,
  f.owner_email,
  f.plan,
  f.status,
  f.access_until,
  f.invite_code,
  au.role
from public.families f
left join public.allowed_users au on au.email = f.owner_email
order by f.created_at desc;
