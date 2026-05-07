-- ============================================================
-- RPC publica pra pagina /convite/[code] consultar dados do convite
-- sem precisar autenticacao. Security definer = bypassa RLS.
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

create or replace function public.get_invite_info(p_code text)
returns table(
  owner_name text,
  owner_plan text,
  owner_status text,
  access_until date
)
language sql security definer set search_path = public stable as $$
  select
    name as owner_name,
    plan as owner_plan,
    status as owner_status,
    access_until
  from public.families
  where invite_code = p_code
    and status = 'active'
  limit 1;
$$;

grant execute on function public.get_invite_info(text) to anon, authenticated;
