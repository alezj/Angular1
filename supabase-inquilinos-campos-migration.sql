-- Campos adicionales para información de contacto del inquilino.
-- Aplicar una sola vez en Supabase SQL Editor.
ALTER TABLE public.inquilinos
  ADD COLUMN IF NOT EXISTS "telefono" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "direccion" TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';
