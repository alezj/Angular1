-- Duración del contrato en meses calendario. No modifica fechas ni contratos existentes.
ALTER TABLE public.alquileres ADD COLUMN IF NOT EXISTS "cantidadMeses" INTEGER;
NOTIFY pgrst, 'reload schema';
