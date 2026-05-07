-- ============================================================
-- Tabela invites_sent — log de convites enviados (anti-spam + tracking)
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists public.invites_sent (
  id              uuid primary key default gen_random_uuid(),
  owner_family_id uuid not null references public.families(id) on delete cascade,
  guest_email     text not null,
  invite_code     text,
  status          text default 'sent',  -- 'sent' | 'clicked' | 'converted' | 'bounced'
  sent_at         timestamptz default now(),
  clicked_at      timestamptz,
  converted_at    timestamptz
);

create index if not exists invites_sent_owner_idx on public.invites_sent (owner_family_id);
create index if not exists invites_sent_guest_idx on public.invites_sent (guest_email);
create index if not exists invites_sent_at_idx on public.invites_sent (sent_at desc);

-- RLS: admins veem tudo, owner ve so os proprios
alter table public.invites_sent enable row level security;

drop policy if exists "admins read invites" on public.invites_sent;
create policy "admins read invites"
  on public.invites_sent for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "owner reads own invites" on public.invites_sent;
create policy "owner reads own invites"
  on public.invites_sent for select
  to authenticated
  using (
    owner_family_id in (
      select id from public.families
      where owner_email = lower(auth.jwt() ->> 'email')
    )
  );
