-- ==============================================================================
-- SCHEMA RBAC & USUARIOS SUPABASE PARA CRM INMOBILIARIO
-- ==============================================================================

-- 1. TABLA ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT NOT NULL,
    "Origen" TEXT NOT NULL DEFAULT 'web' CHECK ("Origen" IN ('web', 'movil')),
    usuario UUID NOT NULL DEFAULT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, "Origen", usuario),
    CONSTRAINT uq_roles_legacy_id UNIQUE (id)
);

INSERT INTO public.roles (id, name, description)
VALUES 
    ('admin', 'Administrador', 'Control total del sistema, administración de usuarios, roles, catálogo y finanzas.'),
    ('agente', 'Agente Inmobiliario', 'Gestión comercial de propiedades, clientes/inquilinos, contratos de alquiler y cobros.'),
    ('mantenimiento', 'Operaciones y Mantenimiento', 'Supervisión y actualización de incidencias, tickets técnicos y reparaciones.'),
    ('cliente', 'Cliente / Inquilino', 'Consulta de propiedades arrendadas, estado de pagos y solicitudes técnicas.')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. TABLA PERMISOS
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT NOT NULL,
    "Origen" TEXT NOT NULL DEFAULT 'web' CHECK ("Origen" IN ('web', 'movil')),
    usuario UUID NOT NULL DEFAULT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    module TEXT NOT NULL,
    description TEXT,
    PRIMARY KEY (id, "Origen", usuario),
    CONSTRAINT uq_permissions_legacy_id UNIQUE (id)
);

INSERT INTO public.permissions (id, module, description)
VALUES
    -- Propiedades
    ('propiedades:read', 'Propiedades', 'Consultar listado y fichas de propiedades'),
    ('propiedades:create', 'Propiedades', 'Registrar nuevas propiedades en el CRM'),
    ('propiedades:update', 'Propiedades', 'Modificar precios, descripciones y datos'),
    ('propiedades:delete', 'Propiedades', 'Eliminar propiedades del inventario'),
    -- Inquilinos y Leads
    ('inquilinos:read', 'Inquilinos y Clientes', 'Ver cartera de clientes e inquilinos'),
    ('inquilinos:create', 'Inquilinos y Clientes', 'Registrar nuevos clientes o prospectos'),
    ('inquilinos:update', 'Inquilinos y Clientes', 'Actualizar información de contacto y contratos'),
    ('inquilinos:delete', 'Inquilinos y Clientes', 'Dar de baja registros de clientes'),
    -- Alquileres / Contratos
    ('alquileres:read', 'Alquileres', 'Visualizar contratos de arrendamiento'),
    ('alquileres:manage', 'Alquileres', 'Crear, modificar o finalizar contratos de alquiler'),
    -- Finanzas y Pagos
    ('pagos:read', 'Finanzas y Pagos', 'Consultar historial de pagos y cobros'),
    ('pagos:create', 'Finanzas y Pagos', 'Registrar ingresos y cobros de alquileres'),
    ('pagos:delete', 'Finanzas y Pagos', 'Anular o corregir registros de pago'),
    -- Mantenimientos
    ('mantenimientos:read', 'Mantenimientos', 'Revisar incidencias y órdenes de trabajo'),
    ('mantenimientos:manage', 'Mantenimientos', 'Crear, asignar y cambiar estado de mantenimientos'),
    -- CRM & Comunicaciones
    ('correos:send', 'Comunicaciones', 'Redactar y enviar notificaciones por correo a clientes'),
    -- Administración
    ('usuarios:read', 'Usuarios y Roles', 'Ver la lista de usuarios y roles del equipo'),
    ('usuarios:manage', 'Usuarios y Roles', 'Asignar roles, invitar y gestionar permisos')
ON CONFLICT (id) DO UPDATE 
SET module = EXCLUDED.module, description = EXCLUDED.description;

-- 3. TABLA ASIGNACIÓN ROL - PERMISOS
CREATE TABLE IF NOT EXISTS public.role_permissions (
    "Origen" TEXT NOT NULL DEFAULT 'web' CHECK ("Origen" IN ('web', 'movil')),
    usuario UUID NOT NULL DEFAULT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id, "Origen", usuario),
    CONSTRAINT uq_role_permissions_legacy_key UNIQUE (role_id, permission_id)
);

-- Permisos para 'admin' (todos los permisos)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Permisos para 'agente'
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('agente', 'propiedades:read'),
    ('agente', 'propiedades:create'),
    ('agente', 'propiedades:update'),
    ('agente', 'inquilinos:read'),
    ('agente', 'inquilinos:create'),
    ('agente', 'inquilinos:update'),
    ('agente', 'alquileres:read'),
    ('agente', 'alquileres:manage'),
    ('agente', 'pagos:read'),
    ('agente', 'pagos:create'),
    ('agente', 'mantenimientos:read'),
    ('agente', 'correos:send')
ON CONFLICT DO NOTHING;

-- Permisos para 'mantenimiento'
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('mantenimiento', 'propiedades:read'),
    ('mantenimiento', 'mantenimientos:read'),
    ('mantenimiento', 'mantenimientos:manage')
ON CONFLICT DO NOTHING;

-- Permisos para 'cliente'
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('cliente', 'propiedades:read'),
    ('cliente', 'pagos:read'),
    ('cliente', 'mantenimientos:read')
ON CONFLICT DO NOTHING;

-- 4. TABLA PERFILES DE USUARIO (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "Origen" TEXT NOT NULL DEFAULT 'web' CHECK ("Origen" IN ('web', 'movil')),
    usuario UUID NOT NULL DEFAULT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    role_id TEXT NOT NULL REFERENCES public.roles(id) DEFAULT 'agente',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, "Origen", usuario),
    CONSTRAINT uq_profiles_legacy_id UNIQUE (id)
);

-- 5. TRIGGER AUTOMÁTICO AL REGISTRAR UN USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    initial_role TEXT;
    user_count INT;
BEGIN
    SELECT count(*) INTO user_count FROM public.profiles;
    -- El primer usuario registrado recibe automáticamente rol 'admin'
    IF user_count = 0 THEN
        initial_role := 'admin';
    ELSE
        initial_role := COALESCE(new.raw_user_meta_data->>'role_id', 'agente');
    END IF;

    INSERT INTO public.profiles (id, email, full_name, phone, role_id, "Origen", usuario)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        initial_role,
        CASE lower(COALESCE(new.raw_user_meta_data->>'Origen', 'web'))
            WHEN 'movil' THEN 'movil'
            WHEN 'móvil' THEN 'movil'
            WHEN 'mobile' THEN 'movil'
            ELSE 'web'
        END,
        COALESCE(auth.uid(), new.id)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. FUNCIÓN DE CONSULTA DE PERMISOS PARA UN USUARIO
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
RETURNS TABLE (permission_id text) AS $$
BEGIN
    RETURN QUERY
    SELECT rp.permission_id
    FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role_id = p.role_id
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Roles: lectura pública, modificación solo admins
    DROP POLICY IF EXISTS "Lectura de roles para todos" ON public.roles;
    CREATE POLICY "Lectura de roles para todos" ON public.roles FOR SELECT TO anon, authenticated USING (true);

    -- Permisos: lectura para usuarios autenticados
    DROP POLICY IF EXISTS "Lectura de permisos para autenticados" ON public.permissions;
    CREATE POLICY "Lectura de permisos para autenticados" ON public.permissions FOR SELECT TO authenticated USING (true);

    -- Role Permissions: lectura para autenticados
    DROP POLICY IF EXISTS "Lectura de rol_permisos para autenticados" ON public.role_permissions;
    CREATE POLICY "Lectura de rol_permisos para autenticados" ON public.role_permissions FOR SELECT TO authenticated USING (true);

    -- Perfiles: Todos los autenticados pueden leer perfiles (para ver asesores/usuarios)
    DROP POLICY IF EXISTS "Lectura de perfiles para autenticados" ON public.profiles;
    CREATE POLICY "Lectura de perfiles para autenticados" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

    -- Perfiles: Cada usuario puede actualizar su propio perfil
    DROP POLICY IF EXISTS "Actualización de propio perfil" ON public.profiles;
    CREATE POLICY "Actualización de propio perfil" ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

    -- Perfiles: Inserción directa permitida para trigger y anon
    DROP POLICY IF EXISTS "Inserción de perfiles" ON public.profiles;
    CREATE POLICY "Inserción de perfiles" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
END $$;
