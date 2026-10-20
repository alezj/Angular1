-- Campos adicionales para cargos y registro de cobros.
-- Aplicar una sola vez en Supabase SQL Editor antes de usar el flujo Cobrar.
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS "idAlquiler" BIGINT,
  ADD COLUMN IF NOT EXISTS "periodo" TEXT,
  ADD COLUMN IF NOT EXISTS "fechaVencimiento" TEXT,
  ADD COLUMN IF NOT EXISTS "estado" TEXT NOT NULL DEFAULT 'Pagado',
  ADD COLUMN IF NOT EXISTS "metodoPago" TEXT,
  ADD COLUMN IF NOT EXISTS "banco" TEXT,
  ADD COLUMN IF NOT EXISTS "referencia" TEXT;

NOTIFY pgrst, 'reload schema';
