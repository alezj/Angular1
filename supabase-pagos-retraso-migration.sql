-- Campo de retraso/mora para desglose del recibo de pago.
-- Aplicar una sola vez en Supabase SQL Editor.
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS "retraso" NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
