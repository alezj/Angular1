-- Depósitos y datos de firma del contrato. Validar primero en Alquilados_Test.
-- Aplicar después de supabase-garantes-schema.sql y supabase-propietario-contrato-schema.sql.
BEGIN;
ALTER TABLE public.alquileres
  ADD COLUMN IF NOT EXISTS "cantidadDepositos" INTEGER,
  ADD COLUMN IF NOT EXISTS "montoTotalDepositos" NUMERIC(12, 2) CHECK ("montoTotalDepositos" >= 0),
  ADD COLUMN IF NOT EXISTS "lugarFirma" TEXT CHECK (length(trim("lugarFirma")) BETWEEN 1 AND 200),
  ADD COLUMN IF NOT EXISTS "fechaFirma" DATE;

-- Conserva la función existente, sus permisos RLS y validaciones de propietario.
DO $$
DECLARE definicion TEXT; actualizada TEXT;
BEGIN
  SELECT pg_get_functiondef('public.guardar_contrato_con_garantes(jsonb,jsonb,bigint)'::regprocedure) INTO definicion;
  IF strpos(definicion, '''montoTotalDepositos''') = 0 THEN
    actualizada := replace(definicion, '''cantidadDepositos'',''diaPago''',
      '''cantidadDepositos'',''montoTotalDepositos'',''lugarFirma'',''fechaFirma'',''diaPago''');
    IF actualizada = definicion THEN RAISE EXCEPTION 'Revisar la lista de campos de guardar_contrato_con_garantes antes de aplicar.'; END IF;
    EXECUTE actualizada;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
