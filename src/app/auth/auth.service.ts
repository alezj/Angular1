import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { Profile, Role } from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly currentProfile = signal<Profile | null>(null);
  readonly permissions = signal<string[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly cargando = signal<boolean>(true);

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentProfile()?.role_id === 'admin');
  readonly isAgente = computed(() => this.currentProfile()?.role_id === 'agente');
  readonly isMantenimiento = computed(() => this.currentProfile()?.role_id === 'mantenimiento');
  readonly isCliente = computed(() => this.currentProfile()?.role_id === 'cliente');

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {
    this.inicializarAuth();
  }

  private async inicializarAuth(): Promise<void> {
    if (typeof window === 'undefined') {
      this.cargando.set(false);
      return;
    }

    try {
      // 1. Cargar catálogo de roles
      await this.cargarRoles();

      // 2. Obtener sesión actual
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      if (session?.user) {
        this.currentUser.set(session.user);
        await this.cargarPerfilYPermisos(session.user.id);
      }
    } catch (err) {
      console.error('Error al inicializar sesión:', err);
    } finally {
      this.cargando.set(false);
    }

    // 3. Escuchar cambios de estado en Supabase Auth
    this.supabaseService.client.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      this.currentUser.set(user);
      if (user) {
        await this.cargarPerfilYPermisos(user.id);
      } else {
        this.currentProfile.set(null);
        this.permissions.set([]);
      }
      this.cargando.set(false);
    });
  }

  async cargarRoles(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('roles')
      .select('*')
      .order('id');
    if (data) {
      this.roles.set(data as Role[]);
    }
  }

  async cargarPerfilYPermisos(userId: string): Promise<void> {
    try {
      // Perfil con rol
      const { data: perfil, error: errPerfil } = await this.supabaseService.client
        .from('profiles')
        .select('*, role:roles(*)')
        .eq('id', userId)
        .single();

      if (!errPerfil && perfil) {
        this.currentProfile.set(perfil as Profile);
      }

      // Permisos asociados al rol
      const roleId = perfil?.role_id;
      if (roleId) {
        const { data: perms } = await this.supabaseService.client
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleId);

        if (perms) {
          this.permissions.set(perms.map((p: any) => p.permission_id));
        }
      }
    } catch (err) {
      console.error('Error al cargar perfil y permisos:', err);
    }
  }

  async iniciarSesion(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: this.traducirErrorAuth(error.message) };
      }

      if (data.user) {
        this.currentUser.set(data.user);
        await this.cargarPerfilYPermisos(data.user.id);
      }

      return { success: true };
    } finally {
      this.cargando.set(false);
    }
  }

  async registrarse(
    email: string,
    password: string,
    nombreCompleto: string,
    telefono: string = '',
    roleId?: string
  ): Promise<{ success: boolean; error?: string }> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supabaseService.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombreCompleto,
            phone: telefono,
            role_id: roleId || 'agente'
          }
        }
      });

      if (error) {
        return { success: false, error: this.traducirErrorAuth(error.message) };
      }

      if (data.user) {
        this.currentUser.set(data.user);
        await this.cargarPerfilYPermisos(data.user.id);
      }

      return { success: true };
    } finally {
      this.cargando.set(false);
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.currentUser.set(null);
    this.currentProfile.set(null);
    this.permissions.set([]);
    this.router.navigate(['/login']);
  }

  async actualizarPerfil(datos: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { error } = await this.supabaseService.client
      .from('profiles')
      .update(datos)
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await this.cargarPerfilYPermisos(user.id);
    return { success: true };
  }

  hasPermission(permiso: string): boolean {
    if (this.isAdmin()) return true;
    return this.permissions().includes(permiso);
  }

  hasRole(rolesPermitidos: string | string[]): boolean {
    const rolActual = this.currentProfile()?.role_id;
    if (!rolActual) return false;
    const arrayRoles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
    return arrayRoles.includes(rolActual);
  }

  private traducirErrorAuth(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Correo electrónico o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Por favor confirma tu correo electrónico antes de ingresar.';
    if (msg.includes('User already registered')) return 'Ya existe una cuenta registrada con este correo electrónico.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }
}
