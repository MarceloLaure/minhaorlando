-- ────────────────────────────────────────────────────────────
-- Lodging (Hospedagem) — campos da casa onde a familia vai ficar
-- ────────────────────────────────────────────────────────────
-- Cada familia tem 1 hospedagem cadastrada (endereco + coordenadas + datas).
-- Familias vinculadas (family_links) podem cadastrar o MESMO endereco,
-- e a tela mostra "Familia X tambem esta aqui".

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS lodging_name        text,
  ADD COLUMN IF NOT EXISTS lodging_address     text,
  ADD COLUMN IF NOT EXISTS lodging_lat         numeric(9, 6),
  ADD COLUMN IF NOT EXISTS lodging_lng         numeric(9, 6),
  ADD COLUMN IF NOT EXISTS lodging_check_in    date,
  ADD COLUMN IF NOT EXISTS lodging_check_out   date;

-- Indice pra acelerar a busca por "outras familias no mesmo endereco"
CREATE INDEX IF NOT EXISTS families_lodging_address_idx
  ON families (lower(lodging_address))
  WHERE lodging_address IS NOT NULL;
