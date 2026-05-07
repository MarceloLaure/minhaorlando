-- ============================================================
-- Periodos do dia (manha/tarde/noite) + resumo no itinerario
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.itinerary
  add column if not exists summary text,
  add column if not exists morning text,
  add column if not exists afternoon text,
  add column if not exists night text;
