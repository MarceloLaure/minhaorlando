-- ────────────────────────────────────────────────────────────
-- Phone — telefone do titular da familia + de cada membro
-- ────────────────────────────────────────────────────────────
-- Permite cadastro manual via /acessadm/ com nome+email+telefone+plano
-- e cadastro de membros adicionais com nome+email+telefone+idade+altura.

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS phone text;
