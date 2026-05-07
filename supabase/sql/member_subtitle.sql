-- ============================================================
-- Subtitulo divertido por membro (apelido/persona)
-- Rodar UMA VEZ no Supabase Dashboard > SQL Editor
-- ============================================================

alter table public.family_members
  add column if not exists subtitle text;

-- Exemplos de uso: "💸 Quem paga a conta", "🌪️ Cuidado com o TDAH",
-- "😴 Dorminhoco", "🛍️ Hoje tem Outlet?"
