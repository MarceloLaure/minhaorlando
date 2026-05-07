-- ============================================================
-- SUBSCRIPTIONS / PAGAMENTOS / VINCULO DE FAMILIAS
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Estende a tabela 'families' com campos de assinatura
alter table public.families add column if not exists owner_email      text;
alter table public.families add column if not exists plan             text;   -- 'family_3m' | 'family_6m' | 'family_12m' | 'guest_3m' | 'guest_6m_50off'
alter table public.families add column if not exists paid_at          timestamptz;
alter table public.families add column if not exists trip_start       date;
alter table public.families add column if not exists trip_end         date;
alter table public.families add column if not exists access_until     date;
alter table public.families add column if not exists status           text default 'pending';  -- 'pending' | 'active' | 'expired' | 'refunded'
alter table public.families add column if not exists kiwify_order_id  text;
alter table public.families add column if not exists invite_code      text;

-- Index pra lookup rapido por invite_code (so quando nao for null)
create unique index if not exists families_invite_code_idx
  on public.families (invite_code) where invite_code is not null;

create index if not exists families_owner_email_idx on public.families (owner_email);
create index if not exists families_status_idx on public.families (status);
create index if not exists families_access_until_idx on public.families (access_until);

-- 2) Tabela 'family_links' — quem convidou quem
create table if not exists public.family_links (
  id                uuid primary key default gen_random_uuid(),
  owner_family_id   uuid not null references public.families(id) on delete cascade,
  guest_family_id   uuid not null references public.families(id) on delete cascade,
  permission        text default 'view',  -- 'view' | 'edit'
  linked_at         timestamptz default now(),
  unique (owner_family_id, guest_family_id)
);

create index if not exists family_links_owner_idx on public.family_links (owner_family_id);
create index if not exists family_links_guest_idx on public.family_links (guest_family_id);

-- RLS pra family_links: membros das duas famílias podem ler
alter table public.family_links enable row level security;

create policy "members can read family links"
  on public.family_links for select
  to authenticated
  using (
    owner_family_id in (select family_id from public.allowed_users where email = auth.jwt() ->> 'email')
    or guest_family_id in (select family_id from public.allowed_users where email = auth.jwt() ->> 'email')
  );

-- 3) Tabela 'kiwify_orders' — log de auditoria de tudo que vem do webhook
create table if not exists public.kiwify_orders (
  id            uuid primary key default gen_random_uuid(),
  order_id      text unique not null,
  product_id    text,
  product_name  text,
  buyer_email   text,
  buyer_name    text,
  plan          text,
  amount_brl    numeric(10,2),
  invite_code   text,                          -- codigo usado se for convidado
  status        text,                          -- evento recebido (order_approved, refund, chargeback)
  family_id     uuid references public.families(id),
  raw_payload   jsonb,
  processed_at  timestamptz,
  created_at    timestamptz default now()
);

create index if not exists kiwify_orders_email_idx on public.kiwify_orders (buyer_email);
create index if not exists kiwify_orders_product_idx on public.kiwify_orders (product_id);
create index if not exists kiwify_orders_status_idx on public.kiwify_orders (status);
create index if not exists kiwify_orders_created_idx on public.kiwify_orders (created_at desc);

-- RLS: bloqueia tudo (so service_role acessa via webhook)
alter table public.kiwify_orders enable row level security;
revoke all on public.kiwify_orders from anon, authenticated;

-- 4) Helper: cria invite_code aleatorio de 8 chars (sem confundir 0/O, 1/I)
create or replace function public.generate_invite_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  rand_idx int;
begin
  for i in 1..8 loop
    rand_idx := 1 + floor(random() * length(chars))::int;
    result := result || substr(chars, rand_idx, 1);
  end loop;
  return result;
end;
$$;
