-- Migration: add creation origin and creator metadata to every application
-- table in public, and include both values in each table's primary key.
--
-- Existing rows are marked as web records with an unknown creator. The
-- reserved UUID is intentionally not a foreign key to auth.users.
-- New authenticated rows default usuario to auth.uid(); unauthenticated rows
-- use the same unknown-creator marker. Mobile clients must send Origen='movil'.

BEGIN;

CREATE TEMP TABLE _origin_user_fks ON COMMIT DROP AS
SELECT conrelid::regclass::text AS table_name,
       conname AS constraint_name,
       pg_get_constraintdef(oid, true) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND (
    conrelid IN (
      'public.estados'::regclass, 'public.propiedades'::regclass,
      'public.inquilinos'::regclass, 'public.pagos'::regclass,
      'public.mantenimientos'::regclass, 'public.alquileres'::regclass,
      'public.roles'::regclass, 'public.permissions'::regclass,
      'public.role_permissions'::regclass, 'public.profiles'::regclass
    )
    OR confrelid IN (
      'public.estados'::regclass, 'public.propiedades'::regclass,
      'public.inquilinos'::regclass, 'public.pagos'::regclass,
      'public.mantenimientos'::regclass, 'public.alquileres'::regclass,
      'public.roles'::regclass, 'public.permissions'::regclass,
      'public.role_permissions'::regclass, 'public.profiles'::regclass
    )
  );

DO $$
DECLARE
  v_table TEXT;
  table_names TEXT[] := ARRAY[
    'estados', 'propiedades', 'inquilinos', 'pagos', 'mantenimientos',
    'alquileres', 'roles', 'permissions', 'role_permissions', 'profiles'
  ];
  fk RECORD;
  pk RECORD;
  has_id BOOLEAN;
BEGIN
  -- Preserve every existing relationship while primary keys are replaced.
  FOR fk IN SELECT * FROM _origin_user_fks LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.constraint_name);
  END LOOP;

  FOREACH v_table IN ARRAY table_names LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "Origen" TEXT', v_table
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS usuario UUID', v_table
    );
    EXECUTE format(
      'UPDATE public.%I SET "Origen" = COALESCE(NULLIF("Origen", ''''), ''web''), '
      'usuario = COALESCE(usuario, ''00000000-0000-0000-0000-000000000000''::uuid)',
      v_table
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN "Origen" SET DEFAULT ''web'', '
      'ALTER COLUMN "Origen" SET NOT NULL, '
      'ALTER COLUMN usuario SET DEFAULT COALESCE(auth.uid(), ''00000000-0000-0000-0000-000000000000''::uuid), '
      'ALTER COLUMN usuario SET NOT NULL',
      v_table
    );

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass
        AND conname = format('ck_%s_origen', v_table)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK ("Origen" IN (''web'', ''movil''))',
        v_table, format('ck_%s_origen', v_table)
      );
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = v_table AND c.column_name = 'id'
    ) INTO has_id;

    IF has_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = format('public.%I', v_table)::regclass
          AND conname = format('uq_%s_legacy_id', v_table)
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id)',
          v_table, format('uq_%s_legacy_id', v_table)
        );
      END IF;
    ELSE
      -- role_permissions has a two-column key instead of an id column.
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = format('public.%I', v_table)::regclass
          AND conname = 'uq_role_permissions_legacy_key'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT uq_role_permissions_legacy_key UNIQUE (role_id, permission_id)',
          v_table
        );
      END IF;
    END IF;

    FOR pk IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass AND contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', v_table, pk.conname);
    END LOOP;

    IF has_id THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id, "Origen", usuario)',
        v_table, format('pk_%s_origin_user', v_table)
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT pk_role_permissions_origin_user '
        'PRIMARY KEY (role_id, permission_id, "Origen", usuario)',
        v_table
      );
    END IF;
  END LOOP;

  -- Restore foreign keys with their original columns and delete/update actions.
  FOR fk IN SELECT * FROM _origin_user_fks LOOP
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I %s',
      fk.table_name, fk.constraint_name, fk.definition
    );
  END LOOP;
END $$;

-- User-created profile rows also receive provenance values. Existing profile
-- identity and role relationships remain keyed by their unique id columns.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_role TEXT;
  user_count INT;
  initial_origin TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN
    initial_role := 'admin';
  ELSE
    initial_role := COALESCE(new.raw_user_meta_data->>'role_id', 'agente');
  END IF;

  initial_origin := CASE lower(COALESCE(new.raw_user_meta_data->>'Origen', 'web'))
    WHEN 'movil' THEN 'movil'
    WHEN 'móvil' THEN 'movil'
    WHEN 'mobile' THEN 'movil'
    ELSE 'web'
  END;

  INSERT INTO public.profiles (id, email, full_name, phone, role_id, "Origen", usuario)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    initial_role,
    initial_origin,
    COALESCE(auth.uid(), new.id)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
