-- ==============================================================================
-- CONFIGURACIÓN DE AUTENTICACIÓN, ROLES Y USUARIO PARA AMBIENTE DE TEST
-- Ejecutar en el SQL Editor de tu proyecto "Alquilados_Test" en Supabase
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABLA ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (id, name, description)
VALUES 
    ('admin', 'Administrador', 'Control total del sistema, administración de usuarios, roles, catálogo y finanzas.'),
    ('agente', 'Agente Inmobiliario', 'Gestión comercial de propiedades, clientes/inquilinos, contratos de alquiler y cobros.'),
    ('mantenimiento', 'Operaciones y Mantenimiento', 'Supervisión y tickets técnicos.'),
    ('cliente', 'Cliente / Inquilino', 'Consulta de inmuebles y solicitudes.')
ON CONFLICT (id) DO NOTHING;

-- 2. TABLA COMPAÑÍAS / EMPRESAS
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.companies (name, slug, status)
VALUES ('InmoGestión República Dominicana', 'inmogestion-republica-dominicana', 'active')
ON CONFLICT (name) DO NOTHING;

-- 3. FUNCIÓN RPC PARA EL SELECTOR DEL LOGIN
CREATE OR REPLACE FUNCTION public.list_active_companies()
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT c.id, c.name FROM public.companies c WHERE c.status = 'active' ORDER BY c.name; $$;

REVOKE ALL ON FUNCTION public.list_active_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_companies() TO anon, authenticated;

-- 4. TABLA PERFILES (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    role_id TEXT REFERENCES public.roles(id) DEFAULT 'admin',
    approval_status TEXT NOT NULL DEFAULT 'approved',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA ROLES GLOBALES (SYSADMIN)
CREATE TABLE IF NOT EXISTS public.global_user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = 'sysAdmin'),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABLA MEMBRESÍA EN EMPRESA
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected', 'disabled')),
  role TEXT NOT NULL DEFAULT 'admin_empresa'
    CHECK (role IN ('admin_empresa', 'usuario')),
  app_role_id TEXT NOT NULL DEFAULT 'admin',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- 7. TABLAS DE PERMISOS
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.company_role_permissions (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, role_id, permission_id)
);

-- 8. POLÍTICAS DE ACCESO (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura roles" ON public.roles;
CREATE POLICY "Lectura roles" ON public.roles FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura companies" ON public.companies;
CREATE POLICY "Lectura companies" ON public.companies FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.global_user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso global_user_roles" ON public.global_user_roles;
CREATE POLICY "Acceso global_user_roles" ON public.global_user_roles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso memberships" ON public.company_memberships;
CREATE POLICY "Acceso memberships" ON public.company_memberships FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso profiles" ON public.profiles;
CREATE POLICY "Acceso profiles" ON public.profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura permissions" ON public.permissions;
CREATE POLICY "Lectura permissions" ON public.permissions FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.company_role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura company_role_permissions" ON public.company_role_permissions;
CREATE POLICY "Lectura company_role_permissions" ON public.company_role_permissions FOR SELECT TO authenticated, anon USING (true);

-- 9. PERMISOS DE TABLAS DE NEGOCIO PARA AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- 10. CREACIÓN / ACTUALIZACIÓN DEL USUARIO JOHANCEL
-- ==============================================================================

-- Asegurar que el usuario existe en auth.users con clave '1234' y email confirmado
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Obtener o crear ID de empresa
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'InmoGestión República Dominicana' LIMIT 1;

  -- Verificar si el usuario ya existe en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'johancel131094@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'johancel131094@gmail.com',
      crypt('1234', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"johancel"}'::jsonb,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('1234', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmed_at = COALESCE(confirmed_at, now()),
        last_sign_in_at = now(),
        raw_user_meta_data = '{"full_name":"johancel"}'::jsonb
    WHERE id = v_user_id;
  END IF;

  -- Perfil de usuario (Administrador)
  INSERT INTO public.profiles (id, email, full_name, role_id, approval_status, is_active)
  VALUES (v_user_id, 'johancel131094@gmail.com', 'johancel', 'admin', 'approved', true)
  ON CONFLICT (id) DO UPDATE
  SET role_id = 'admin', approval_status = 'approved', is_active = true, full_name = 'johancel';

  -- SysAdmin (Super Administrador Global)
  INSERT INTO public.global_user_roles (user_id, role)
  VALUES (v_user_id, 'sysAdmin')
  ON CONFLICT (user_id) DO NOTHING;

  -- Membresía de empresa aprobada
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.company_memberships (company_id, user_id, status, role, app_role_id, approved_at)
    VALUES (v_company_id, v_user_id, 'approved', 'admin_empresa', 'admin', now())
    ON CONFLICT (company_id, user_id) DO UPDATE
    SET status = 'approved', role = 'admin_empresa', app_role_id = 'admin';
  END IF;
END $$;
