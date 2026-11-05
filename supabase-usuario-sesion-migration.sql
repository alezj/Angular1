-- ==============================================================================
-- MIGRACIÓN: INICIO DE SESIÓN POR USUARIOSESION Y VALIDACIÓN DE CORREO
-- ==============================================================================

-- 1. Agregar columna usuarioSesion en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "usuarioSesion" TEXT;

-- Crear índice único case-insensitive para que ningún usuario repita nombre de usuario
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_usuario_sesion_lower 
ON public.profiles (LOWER("usuarioSesion"));

-- 2. Asignar usuarioSesion a perfiles existentes que no lo tengan
UPDATE public.profiles
SET "usuarioSesion" = split_part(email, '@', 1)
WHERE "usuarioSesion" IS NULL;

-- Asegurar usuario 'johancel'
UPDATE public.profiles
SET "usuarioSesion" = 'johancel'
WHERE email = 'johancel131094@gmail.com';

-- 3. FUNCIÓN RPC: Obtener correo a partir de usuarioSesion o email
-- Usada en login para autenticar contra Supabase Auth
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email
    FROM public.profiles
    WHERE lower("usuarioSesion") = lower(trim(p_username))
       OR lower(email) = lower(trim(p_username))
    LIMIT 1;

    RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- 4. FUNCIÓN RPC: Verificar disponibilidad de nombre de usuario en registro
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE lower("usuarioSesion") = lower(trim(p_username))
    );
$$;

REVOKE ALL ON FUNCTION public.check_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon, authenticated;

-- 5. TRIGGER AUTOMÁTICO AL REGISTRAR UN USUARIO CON USUARIOSESION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    initial_role TEXT;
    user_count INT;
    v_username TEXT;
BEGIN
    SELECT count(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        initial_role := 'admin';
    ELSE
        initial_role := COALESCE(new.raw_user_meta_data->>'role_id', 'agente');
    END IF;

    v_username := COALESCE(new.raw_user_meta_data->>'usuarioSesion', split_part(new.email, '@', 1));

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        "usuarioSesion", 
        phone, 
        role_id, 
        "Origen", 
        usuario
    ) VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        v_username,
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
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        "usuarioSesion" = COALESCE(EXCLUDED."usuarioSesion", public.profiles."usuarioSesion");

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

