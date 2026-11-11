-- Datos del garante y renta mensual propia de cada contrato.
-- Compatible con contratos existentes: no cambia sus importes ni su historial.
ALTER TABLE public.alquileres
  ADD COLUMN IF NOT EXISTS "garanteCedula" TEXT,
  ADD COLUMN IF NOT EXISTS "garanteNombreCompleto" TEXT,
  ADD COLUMN IF NOT EXISTS "montoPago" NUMERIC(12, 2);

NOTIFY pgrst, 'reload schema';
