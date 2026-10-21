-- Align app RPCs with the existing schema:
-- companies(name, status)
-- company_memberships(role, app_role_id, status)
-- company_role_permissions(role_id TEXT, permission_id)
-- Run in Supabase SQL Editor after deploying the matching frontend.
BEGIN;

-- The original multi-tenant migration may have stopped before creating this
-- authorization helper. Create the storage and function before dependent RPCs.
CREATE TABLE IF NOT EXISTS public.global_user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = 'sysAdmin'),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_sysadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.global_user_roles g
  WHERE g.user_id = auth.uid() AND g.role = 'sysAdmin'
) $$;
REVOKE ALL ON FUNCTION public.is_sysadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sysadmin() TO authenticated;
ALTER TABLE public.global_user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_roles_read ON public.global_user_roles;
CREATE POLICY global_roles_read ON public.global_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_sysadmin());
REVOKE ALL ON public.global_user_roles FROM anon, authenticated;
GRANT SELECT ON public.global_user_roles TO authenticated;

-- The prior function returned `nombre`; drop it to change the output name.
DROP FUNCTION IF EXISTS public.list_active_companies();
CREATE FUNCTION public.list_active_companies()
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT c.id, c.name
  FROM public.companies c
  WHERE c.status = 'active'
  ORDER BY c.name
$$;
REVOKE ALL ON FUNCTION public.list_active_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_companies() TO anon, authenticated;

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
    RAISE EXCEPTION 'Rol no disponible';
  END IF;
  UPDATE public.company_memberships
  SET status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
      app_role_id = target_role,
      role = target_role,
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
  UPDATE public.company_memberships
  SET status = target_status,
      approved_by = CASE WHEN target_status = 'approved' THEN auth.uid() ELSE approved_by END,
      approved_at = CASE WHEN target_status = 'approved' THEN now() ELSE NULL END
  WHERE company_id = target_company AND user_id = target_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no encontrada'; END IF;
  UPDATE public.profiles
  SET approval_status = target_status,
      is_active = target_status = 'approved',
      empresa_id = CASE WHEN target_status = 'approved' THEN target_company ELSE empresa_id END,
      updated_at = now()
  WHERE id = target_user;
END $$;

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

CREATE OR REPLACE FUNCTION public.create_company(company_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE new_company UUID;
        base_slug TEXT;
        candidate_slug TEXT;
        suffix_number INTEGER := 1;
BEGIN
  IF NOT public.is_sysadmin() THEN
    RAISE EXCEPTION 'Solo SysAdmin puede crear empresas' USING ERRCODE = '42501';
  END IF;
  IF length(trim(company_name)) < 2 THEN
    RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres';
  END IF;
  base_slug := trim(both '-' FROM regexp_replace(
    lower(translate(trim(company_name), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', '-', 'g'
  ));
  IF base_slug = '' THEN base_slug := 'empresa'; END IF;

  LOOP
    candidate_slug := CASE WHEN suffix_number = 1
      THEN base_slug ELSE base_slug || '-' || suffix_number::text END;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.companies WHERE slug = candidate_slug
    );
    suffix_number := suffix_number + 1;
  END LOOP;
  INSERT INTO public.companies (name, slug, status)
  VALUES (trim(company_name), candidate_slug, 'active')
  RETURNING id INTO new_company;
  INSERT INTO public.company_role_permissions (company_id, role_id, permission_id)
  SELECT new_company, rp.role_id, rp.permission_id
  FROM public.role_permissions rp
  ON CONFLICT DO NOTHING;
  RETURN new_company;
END $$;

CREATE OR REPLACE FUNCTION public.update_company(
  target_company UUID, company_name TEXT, target_status TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_sysadmin() THEN
    RAISE EXCEPTION 'Solo SysAdmin puede modificar empresas' USING ERRCODE = '42501';
  END IF;
  IF target_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  IF length(trim(company_name)) < 2 THEN
    RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres';
  END IF;
  UPDATE public.companies
  SET name = trim(company_name), status = target_status, updated_at = now()
  WHERE id = target_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa no encontrada'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.create_company(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_company(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company(TEXT), public.update_company(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_permission(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_company_membership(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_company_membership_status(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_company_membership(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_membership_status(UUID, UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.move_company_membership(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_company_membership(UUID, UUID, UUID) TO authenticated;

-- Keep sign-up aligned with the existing membership columns.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id);

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
    INSERT INTO public.company_memberships
      (company_id, user_id, role, app_role_id, status)
    SELECT requested_company, NEW.id, 'agente', 'agente', 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = requested_company AND user_id = NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

COMMIT;
