-- Tabela de fila de espera da landing
-- Captura email + data prevista da viagem pra dar 15% OFF no lancamento

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  trip_date   date,                    -- quando a familia vai
  source      text default 'landing',  -- de onde veio (landing, ig, etc)
  user_agent  text,
  referrer    text,
  ip_country  text,
  created_at  timestamptz not null default now(),
  unique (email)
);

-- RLS: qualquer um pode INSERIR (publico), so admin pode LER
alter table public.waitlist enable row level security;

create policy "anyone can insert waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Bloqueia leitura publica (so service_role / dashboard ve)
revoke select on public.waitlist from anon, authenticated;

-- Index pra busca rapida por email + data
create index if not exists waitlist_email_idx on public.waitlist (email);
create index if not exists waitlist_trip_date_idx on public.waitlist (trip_date);
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
