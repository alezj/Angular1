-- Multi-tenant CRM migration
-- Run once in Supabase SQL Editor after taking a database backup.
-- Historical business records are assigned to the confirmed tenant
-- InmoGestión República Dominicana.
-- Before applying, record current row counts and inspect any legacy orphans:
-- SELECT 'propiedades' AS tabla, count(*) AS filas FROM public.propiedades
-- UNION ALL SELECT 'inquilinos', count(*) FROM public.inquilinos
-- UNION ALL SELECT 'alquileres', count(*) FROM public.alquileres
-- UNION ALL SELECT 'pagos', count(*) FROM public.pagos
-- UNION ALL SELECT 'mantenimientos', count(*) FROM public.mantenimientos
-- UNION ALL SELECT 'estados', count(*) FROM public.estados;
-- SELECT count(*) AS auth_users_before_migration FROM auth.users;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The existing Supabase companies table uses `name` and `status`.
INSERT INTO public.companies (name, slug, status)
SELECT 'InmoGestión República Dominicana', 'inmogestion-republica-dominicana', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE name = 'InmoGestión República Dominicana'
);

CREATE TABLE IF NOT EXISTS public.global_user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = 'sysAdmin'),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot the users that exist at migration time. The signup trigger below
-- never inserts into this table, so future registrations cannot become SysAdmin.
INSERT INTO public.global_user_roles (user_id, role)
SELECT id, 'sysAdmin' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'disabled')),
  role TEXT NOT NULL DEFAULT 'usuario'
    CHECK (role IN ('admin_empresa', 'usuario')),
  app_role_id TEXT NOT NULL DEFAULT 'agente',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.company_role_permissions (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS company_memberships_user_status_idx
  ON public.company_memberships (user_id, status);
-- Each sign-in account belongs to one company. Global SysAdmins administer
-- companies through their global role and do not need tenant memberships.
CREATE UNIQUE INDEX IF NOT EXISTS company_memberships_one_company_per_user
  ON public.company_memberships (user_id);

-- Create the confirmed tenant and preserve every existing profile as an
-- approved member with its current in-company role.
INSERT INTO public.company_memberships (company_id, user_id, status, role, app_role_id, approved_at)
SELECT c.id, p.id, 'approved',
       CASE WHEN p.role_id = 'admin' THEN 'admin_empresa' ELSE 'usuario' END,
       CASE WHEN EXISTS (SELECT 1 FROM public.roles r WHERE r.id = p.role_id)
            THEN p.role_id ELSE 'agente' END,
       now()
FROM public.companies c
CROSS JOIN public.profiles p
WHERE c.name = 'InmoGestión República Dominicana'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (id, module, description)
VALUES ('pagos:update', 'Finanzas y Pagos', 'Editar cobros y datos de pagos registrados')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', 'pagos:update'
WHERE EXISTS (SELECT 1 FROM public.roles WHERE id = 'admin')
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'agente', 'pagos:update'
WHERE EXISTS (SELECT 1 FROM public.roles WHERE id = 'agente')
ON CONFLICT DO NOTHING;

INSERT INTO public.company_role_permissions (company_id, role_id, permission_id)
SELECT c.id, rp.role_id, rp.permission_id
FROM public.companies c
CROSS JOIN public.role_permissions rp
WHERE c.name = 'InmoGestión República Dominicana'
ON CONFLICT DO NOTHING;

-- A pending user's company selection is not an authorization. Return only the
-- public identifiers and names needed by the signup selector.
CREATE OR REPLACE FUNCTION public.list_active_companies()
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT c.id, c.name FROM public.companies c WHERE c.status = 'active' ORDER BY c.name $$;
REVOKE ALL ON FUNCTION public.list_active_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_companies() TO anon, authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id);

UPDATE public.profiles p
SET empresa_id = c.id, approval_status = 'approved', is_active = true
FROM public.companies c
WHERE c.name = 'InmoGestión República Dominicana'
  AND EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = c.id AND m.user_id = p.id AND m.status = 'approved'
  );

-- Apply a tenant key to all business tables. Existing rows are explicitly
-- mapped to the single company confirmed by the owner.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['estados','propiedades','inquilinos','alquileres','pagos','mantenimientos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id)', t);
    EXECUTE format(
      'UPDATE public.%I SET empresa_id = (SELECT id FROM public.companies WHERE name = %L) WHERE empresa_id IS NULL',
      t, 'InmoGestión República Dominicana'
    );
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (empresa_id)', t || '_empresa_id_idx', t);
  END LOOP;
END $$;

-- Estado IDs are stored on properties and maintenance rows, so retain the
-- familiar 1..8 catalog IDs in every tenant and scope their key by company.
DO $$
DECLARE pk_name TEXT;
BEGIN
  SELECT conname INTO pk_name FROM pg_constraint
  WHERE conrelid = 'public.estados'::regclass AND contype = 'p';
  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.estados DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;
ALTER TABLE public.estados DROP CONSTRAINT IF EXISTS uq_estados_legacy_id;
ALTER TABLE public.estados ADD CONSTRAINT pk_estados_empresa PRIMARY KEY (empresa_id, id, "Origen", usuario);
ALTER TABLE public.estados ADD CONSTRAINT uq_estados_empresa_id UNIQUE (empresa_id, id);

INSERT INTO public.estados (id, empresa_id, "Origen", usuario, "Descripcion", "tabla")
SELECT seed.id, c.id, 'web', '00000000-0000-0000-0000-000000000000'::uuid, seed.descripcion, seed.tabla
FROM public.companies c
CROSS JOIN (VALUES
  (1, 'Disponible', 'propiedades'), (2, 'Alquilada', 'propiedades'),
  (3, 'Mantenimiento', 'propiedades'), (4, 'Inactiva', 'propiedades'),
  (5, 'Pendiente', 'mantenimientos'), (6, 'En proceso', 'mantenimientos'),
  (7, 'Finalizado', 'mantenimientos'), (8, 'Cancelado', 'mantenimientos')
) AS seed(id, descripcion, tabla)
WHERE c.name = 'InmoGestión República Dominicana'
ON CONFLICT (empresa_id, id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.estados', 'id'), GREATEST(COALESCE((SELECT max(id) FROM public.estados), 1), 1));

-- Tenant-scoped keys and foreign keys prevent cross-company relationships.
DO $$
BEGIN
  ALTER TABLE public.propiedades ADD CONSTRAINT uq_propiedades_empresa_id UNIQUE (empresa_id, id);
  ALTER TABLE public.inquilinos ADD CONSTRAINT uq_inquilinos_empresa_id UNIQUE (empresa_id, id);
  ALTER TABLE public.alquileres ADD CONSTRAINT uq_alquileres_empresa_id UNIQUE (empresa_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT conname, conrelid::regclass AS tbl FROM pg_constraint
    WHERE contype = 'f' AND conrelid IN (
      'public.pagos'::regclass, 'public.mantenimientos'::regclass, 'public.alquileres'::regclass
    ) AND conname IN (
      'pagos_idInquilino_fkey','pagos_idAlquiler_fkey',
      'mantenimientos_propiedadID_fkey','alquileres_propiedadID_fkey','alquileres_inquilinoID_fkey'
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;

ALTER TABLE public.pagos
  ADD CONSTRAINT pagos_empresa_inquilino_fkey FOREIGN KEY (empresa_id, "idInquilino")
    REFERENCES public.inquilinos (empresa_id, id) ON DELETE SET NULL ("idInquilino"),
  ADD CONSTRAINT pagos_empresa_alquiler_fkey FOREIGN KEY (empresa_id, "idAlquiler")
    REFERENCES public.alquileres (empresa_id, id) ON DELETE SET NULL ("idAlquiler");

ALTER TABLE public.mantenimientos
  ADD CONSTRAINT mantenimientos_empresa_propiedad_fkey FOREIGN KEY (empresa_id, "propiedadID")
    REFERENCES public.propiedades (empresa_id, id) ON DELETE CASCADE;

ALTER TABLE public.alquileres
  ADD CONSTRAINT alquileres_empresa_propiedad_fkey FOREIGN KEY (empresa_id, "propiedadID")
    REFERENCES public.propiedades (empresa_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT alquileres_empresa_inquilino_fkey FOREIGN KEY (empresa_id, "inquilinoID")
    REFERENCES public.inquilinos (empresa_id, id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT min(m.company_id::text)::uuid
  FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  WHERE m.user_id = auth.uid() AND m.status = 'approved' AND c.status = 'active'
  HAVING count(*) = 1
$$;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

ALTER TABLE public.estados ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();
ALTER TABLE public.propiedades ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();
ALTER TABLE public.inquilinos ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();
ALTER TABLE public.alquileres ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();
ALTER TABLE public.pagos ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();
ALTER TABLE public.mantenimientos ALTER COLUMN empresa_id SET DEFAULT public.current_company_id();

CREATE OR REPLACE FUNCTION public.is_sysadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.global_user_roles g
  WHERE g.user_id = auth.uid() AND g.role = 'sysAdmin'
) $$;

CREATE OR REPLACE FUNCTION public.has_company_access(target_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT public.is_sysadmin() OR EXISTS (
  SELECT 1 FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  WHERE m.company_id = target_company AND m.user_id = auth.uid()
    AND m.status = 'approved' AND c.status = 'active'
) $$;

CREATE OR REPLACE FUNCTION public.is_company_admin(target_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT public.is_sysadmin() OR EXISTS (
  SELECT 1 FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  WHERE m.company_id = target_company AND m.user_id = auth.uid()
    AND m.status = 'approved' AND m.app_role_id = 'admin' AND c.status = 'active'
) $$;

CREATE OR REPLACE FUNCTION public.has_company_permission(target_company UUID, permission_code TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT public.is_sysadmin() OR EXISTS (
  SELECT 1 FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  JOIN public.company_role_permissions crp
    ON crp.company_id = m.company_id AND crp.role_id = m.app_role_id
  WHERE m.company_id = target_company AND m.user_id = auth.uid()
    AND m.status = 'approved' AND c.status = 'active'
    AND crp.permission_id = permission_code
) $$;

REVOKE ALL ON FUNCTION public.is_sysadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_company_access(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_admin(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_company_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sysadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_permission(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_company_membership(
  target_company UUID, target_user UUID, target_role TEXT, approve BOOLEAN DEFAULT true
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE actor_is_sysadmin BOOLEAN := public.is_sysadmin();
BEGIN
  IF NOT actor_is_sysadmin AND NOT public.is_company_admin(target_company) THEN
    RAISE EXCEPTION 'No autorizado para administrar esta empresa' USING ERRCODE = '42501';
  END IF;
  IF NOT actor_is_sysadmin AND target_role = 'admin' THEN
    RAISE EXCEPTION 'Solo SysAdmin puede asignar administradores de empresa' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.id = target_role) THEN
    RAISE EXCEPTION 'Rol no disponible en esta empresa';
  END IF;
  UPDATE public.company_memberships
  SET status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
      role = CASE WHEN target_role = 'admin' THEN 'admin_empresa' ELSE 'usuario' END,
      app_role_id = target_role,
      approved_by = auth.uid(),
      approved_at = CASE WHEN approve THEN now() ELSE NULL END
  WHERE company_id = target_company AND user_id = target_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud de membresía no encontrada'; END IF;
  UPDATE public.profiles
  SET approval_status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
      role_id = target_role,
      is_active = approve,
      empresa_id = target_company,
      updated_at = now()
  WHERE id = target_user;
END $$;

REVOKE ALL ON FUNCTION public.approve_company_membership(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_company_membership(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_company_membership_status(
  target_company UUID, target_user UUID, target_status TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF target_status NOT IN ('approved', 'rejected', 'disabled', 'pending') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  IF NOT public.is_sysadmin() AND NOT public.is_company_admin(target_company) THEN
    RAISE EXCEPTION 'No autorizado para administrar esta empresa' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_sysadmin() AND EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = target_company AND m.user_id = target_user AND m.app_role_id = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo SysAdmin puede cambiar el estado de un administrador de empresa' USING ERRCODE = '42501';
  END IF;
  IF target_status = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.company_memberships m
    JOIN public.roles r ON r.id = m.app_role_id
    WHERE m.company_id = target_company AND m.user_id = target_user
  ) THEN
    RAISE EXCEPTION 'La membresía no tiene un rol válido para esta empresa';
  END IF;
  UPDATE public.company_memberships m
  SET status = target_status,
      approved_by = CASE WHEN target_status = 'approved' THEN auth.uid() ELSE approved_by END,
      approved_at = CASE WHEN target_status = 'approved' THEN now() ELSE NULL END
  WHERE m.company_id = target_company AND m.user_id = target_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no encontrada'; END IF;
  UPDATE public.profiles
  SET approval_status = target_status,
      is_active = target_status = 'approved',
      empresa_id = CASE WHEN target_status = 'approved' THEN target_company ELSE empresa_id END,
      updated_at = now()
  WHERE id = target_user;
END $$;
REVOKE ALL ON FUNCTION public.set_company_membership_status(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_company_membership_status(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.move_company_membership(
  source_company UUID, target_user UUID, target_company UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_sysadmin() THEN
    RAISE EXCEPTION 'Solo SysAdmin puede cambiar la empresa de un usuario' USING ERRCODE = '42501';
  END IF;
  IF source_company = target_company THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = target_company AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'La empresa seleccionada no existe o está suspendida';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = target_user AND company_id = target_company
  ) THEN
    RAISE EXCEPTION 'El usuario ya tiene una membresía en la empresa seleccionada';
  END IF;
  UPDATE public.company_memberships
  SET company_id = target_company
  WHERE user_id = target_user AND company_id = source_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la membresía actual del usuario'; END IF;
  UPDATE public.profiles
  SET empresa_id = target_company, updated_at = now()
  WHERE id = target_user;
END $$;

REVOKE ALL ON FUNCTION public.move_company_membership(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_company_membership(UUID, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_company(company_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_company UUID;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix_number INTEGER := 1;
BEGIN
  IF NOT public.is_sysadmin() THEN
    RAISE EXCEPTION 'Solo SysAdmin puede crear empresas' USING ERRCODE = '42501';
  END IF;
  IF length(trim(company_name)) < 2 THEN RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres'; END IF;
  base_slug := trim(both '-' FROM regexp_replace(
    lower(translate(trim(company_name), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', '-', 'g'
  ));
  IF base_slug = '' THEN base_slug := 'empresa'; END IF;
  LOOP
    candidate_slug := CASE WHEN suffix_number = 1
      THEN base_slug ELSE base_slug || '-' || suffix_number::text END;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE slug = candidate_slug);
    suffix_number := suffix_number + 1;
  END LOOP;
  INSERT INTO public.companies (name, slug, status)
  VALUES (trim(company_name), candidate_slug, 'active')
  RETURNING id INTO new_company;
  INSERT INTO public.company_role_permissions (company_id, role_id, permission_id)
  SELECT new_company, rp.role_id, rp.permission_id FROM public.role_permissions rp
  ON CONFLICT DO NOTHING;
  INSERT INTO public.estados (id, empresa_id, "Origen", usuario, "Descripcion", "tabla")
  SELECT seed.id, new_company, 'web', auth.uid(), seed.descripcion, seed.tabla
  FROM (VALUES
    (1, 'Disponible', 'propiedades'), (2, 'Alquilada', 'propiedades'),
    (3, 'Mantenimiento', 'propiedades'), (4, 'Inactiva', 'propiedades'),
    (5, 'Pendiente', 'mantenimientos'), (6, 'En proceso', 'mantenimientos'),
    (7, 'Finalizado', 'mantenimientos'), (8, 'Cancelado', 'mantenimientos')
  ) AS seed(id, descripcion, tabla);
  RETURN new_company;
END $$;

CREATE OR REPLACE FUNCTION public.update_company(target_company UUID, company_name TEXT, target_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_sysadmin() THEN
    RAISE EXCEPTION 'Solo SysAdmin puede modificar empresas' USING ERRCODE = '42501';
  END IF;
  IF target_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
  IF length(trim(company_name)) < 2 THEN RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres'; END IF;
  UPDATE public.companies SET name = trim(company_name), status = target_status, updated_at = now()
  WHERE id = target_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa no encontrada'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_company(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_company(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company(TEXT), public.update_company(UUID, TEXT, TEXT) TO authenticated;

-- Signup creates a pending request only. Role metadata is ignored.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE requested_company UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role_id, is_active, approval_status)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'agente', false, 'pending')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  BEGIN
    requested_company := (NEW.raw_user_meta_data->>'company_id')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    requested_company := NULL;
  END;
  IF requested_company IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.companies WHERE id = requested_company AND status = 'active'
  ) THEN
    INSERT INTO public.company_memberships (company_id, user_id, status, role, app_role_id)
    VALUES (requested_company, NEW.id, 'pending', 'usuario', 'agente')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Replace every existing policy on the affected tables. RLS policies are ORed,
-- so leaving a previous permissive policy would defeat tenant isolation.
DO $$
DECLARE t TEXT; p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'estados','propiedades','inquilinos','alquileres','pagos','mantenimientos',
    'profiles','roles','permissions','role_permissions','companies',
    'company_memberships','global_user_roles','company_role_permissions'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['estados','propiedades','inquilinos','alquileres','pagos','mantenimientos'] LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (public.has_company_permission(empresa_id, %L))', t, CASE t WHEN 'estados' THEN 'propiedades:read' WHEN 'propiedades' THEN 'propiedades:read' WHEN 'inquilinos' THEN 'inquilinos:read' WHEN 'alquileres' THEN 'alquileres:read' WHEN 'pagos' THEN 'pagos:read' ELSE 'mantenimientos:read' END);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_company_permission(empresa_id, %L))', t, CASE t WHEN 'estados' THEN 'propiedades:create' WHEN 'propiedades' THEN 'propiedades:create' WHEN 'inquilinos' THEN 'inquilinos:create' WHEN 'alquileres' THEN 'alquileres:manage' WHEN 'pagos' THEN 'pagos:create' ELSE 'mantenimientos:manage' END);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (public.has_company_permission(empresa_id, %L)) WITH CHECK (public.has_company_permission(empresa_id, %L))', t, CASE t WHEN 'estados' THEN 'propiedades:update' WHEN 'propiedades' THEN 'propiedades:update' WHEN 'inquilinos' THEN 'inquilinos:update' WHEN 'alquileres' THEN 'alquileres:manage' WHEN 'pagos' THEN 'pagos:update' ELSE 'mantenimientos:manage' END, CASE t WHEN 'estados' THEN 'propiedades:update' WHEN 'propiedades' THEN 'propiedades:update' WHEN 'inquilinos' THEN 'inquilinos:update' WHEN 'alquileres' THEN 'alquileres:manage' WHEN 'pagos' THEN 'pagos:update' ELSE 'mantenimientos:manage' END);
    EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (public.has_company_permission(empresa_id, %L))', t, CASE t WHEN 'estados' THEN 'propiedades:delete' WHEN 'propiedades' THEN 'propiedades:delete' WHEN 'inquilinos' THEN 'inquilinos:delete' WHEN 'pagos' THEN 'pagos:delete' WHEN 'alquileres' THEN 'alquileres:manage' ELSE 'mantenimientos:manage' END);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated
  USING (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships m WHERE m.company_id = id AND m.user_id = auth.uid()
  ));
CREATE POLICY companies_admin ON public.companies FOR ALL TO authenticated
  USING (public.is_sysadmin()) WITH CHECK (public.is_sysadmin());
CREATE POLICY membership_read ON public.company_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(company_id));
CREATE POLICY membership_admin_update ON public.company_memberships FOR UPDATE TO authenticated
  USING (public.is_sysadmin()) WITH CHECK (public.is_sysadmin());
CREATE POLICY global_roles_read ON public.global_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_sysadmin());
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_sysadmin() OR (empresa_id IS NOT NULL AND public.has_company_access(empresa_id)) OR EXISTS (
    SELECT 1 FROM public.company_memberships target
    WHERE target.user_id = id AND public.is_company_admin(target.company_id)
  ));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships target
    WHERE target.user_id = id AND public.is_company_admin(target.company_id)
  ))
  WITH CHECK (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships target
    WHERE target.user_id = id AND public.is_company_admin(target.company_id)
  ));
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated
  USING (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'approved'
  ));
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated
  USING (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'approved'
  ));
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_sysadmin() OR EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'approved'
  ));
CREATE POLICY company_role_permissions_read ON public.company_role_permissions FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));
CREATE POLICY company_role_permissions_manage ON public.company_role_permissions FOR ALL TO authenticated
  USING (public.is_company_admin(company_id)) WITH CHECK (public.is_company_admin(company_id));

REVOKE ALL ON public.global_user_roles FROM anon, authenticated;
REVOKE ALL ON public.companies, public.company_memberships, public.profiles,
  public.company_role_permissions FROM anon, authenticated;
GRANT SELECT ON public.global_user_roles, public.companies, public.company_memberships,
  public.profiles, public.roles, public.permissions, public.role_permissions,
  public.company_role_permissions TO authenticated;
REVOKE INSERT ON public.company_memberships FROM authenticated;
REVOKE UPDATE ON public.company_memberships FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_role_permissions TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.roles, public.permissions, public.role_permissions FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_permissions(UUID) FROM PUBLIC, anon, authenticated;

COMMIT;

-- Post-migration verification:
-- SELECT name, id, status FROM public.companies;
-- SELECT role, count(*) FROM public.global_user_roles GROUP BY role;
-- SELECT status, count(*) FROM public.company_memberships GROUP BY status;
-- SELECT 'propiedades' AS tabla, count(*) FILTER (WHERE empresa_id IS NULL) AS sin_empresa FROM public.propiedades
-- UNION ALL SELECT 'inquilinos', count(*) FILTER (WHERE empresa_id IS NULL) FROM public.inquilinos
-- UNION ALL SELECT 'alquileres', count(*) FILTER (WHERE empresa_id IS NULL) FROM public.alquileres
-- UNION ALL SELECT 'pagos', count(*) FILTER (WHERE empresa_id IS NULL) FROM public.pagos
-- UNION ALL SELECT 'mantenimientos', count(*) FILTER (WHERE empresa_id IS NULL) FROM public.mantenimientos
-- UNION ALL SELECT 'estados', count(*) FILTER (WHERE empresa_id IS NULL) FROM public.estados;
