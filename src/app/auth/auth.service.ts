import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { Company, Profile, Role } from './auth.models';
import { StorageCacheService } from '../storage-cache.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly inicializacion: Promise<void>;
  readonly currentUser = signal<User | null>(null);
  readonly currentProfile = signal<Profile | null>(null);
  readonly permissions = signal<string[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly companies = signal<Company[]>([]);
  readonly companyId = signal<string | null>(null);
  readonly globalRole = signal<string | null>(null);
  readonly approvalStatus = signal<string | null>(null);
  readonly companyActive = signal<boolean>(false);
  readonly isSysAdmin = computed(() => this.globalRole() === 'sysAdmin');
  readonly isAuthorized = computed(() => this.isSysAdmin() || (
    this.currentProfile()?.is_active === true &&
    this.currentProfile()?.approval_status === 'approved' &&
    this.companyActive() &&
    !!this.companyId()
  ));
  readonly cargando = signal<boolean>(true);

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.isSysAdmin() || this.currentProfile()?.role_id === 'admin');
  readonly isAgente = computed(() => this.currentProfile()?.role_id === 'agente');
  readonly isMantenimiento = computed(() => this.currentProfile()?.role_id === 'mantenimiento');
  readonly isCliente = computed(() => this.currentProfile()?.role_id === 'cliente');

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router,
    private readonly cache: StorageCacheService
  ) {
    this.inicializacion = this.inicializarAuth();
  }

  async esperarInicializacion(): Promise<void> {
    await this.inicializacion;
  }

  private async inicializarAuth(): Promise<void> {
    if (typeof window === 'undefined') {
      this.cargando.set(false);
      return;
    }

    // Escuchar primero para capturar la sesión que Supabase restaura del almacenamiento local.
    let previousUserId: string | null = null;
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      this.currentUser.set(user);
      if (previousUserId !== user?.id) this.cache.invalidateAll();
      previousUserId = user?.id ?? null;
      if (user) {
        this.currentProfile.set(null);
        this.permissions.set([]);
        this.companyId.set(null);
        this.globalRole.set(null);
        this.approvalStatus.set(null);
        this.companyActive.set(false);
        void this.cargarPerfilYPermisos(user.id);
      } else {
        this.currentProfile.set(null);
        this.permissions.set([]);
        this.companyId.set(null);
        this.globalRole.set(null);
        this.approvalStatus.set(null);
        this.companyActive.set(false);
      }
      this.cargando.set(false);
    });

    try {
      // Recuperar el token guardado antes de hacer consultas adicionales a la base de datos.
      const { data: { session }, error } = await this.supabaseService.client.auth.getSession();
      if (error) throw error;
      this.currentUser.set(session?.user ?? null);
      this.cargando.set(false);

      // Los datos auxiliares no deben impedir que la ruta reconozca una sesión almacenada.
      void this.cargarRoles();
      if (session?.user) void this.cargarPerfilYPermisos(session.user.id);
    } catch (err) {
      console.error('Error al restaurar sesión:', err);
      this.cargando.set(false);
    }
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

  async cargarEmpresas(): Promise<void> {
    const { data } = await this.supabaseService.client.rpc('list_active_companies');
    this.companies.set((data || []) as Company[]);
  }

  async cargarPerfilYPermisos(userId: string): Promise<void> {
    try {
      const [{ data: roleData }, { data: membership }] = await Promise.all([
        this.supabaseService.client.from('global_user_roles').select('role').eq('user_id', userId).maybeSingle(),
        this.supabaseService.client.from('company_memberships')
          .select('company_id, role_id, company_role_id, status, company:companies(estado)')
          .eq('user_id', userId).maybeSingle()
      ]);
      this.globalRole.set(roleData?.role ?? null);
      this.companyId.set(membership?.company_id ?? null);
      this.approvalStatus.set(membership?.status ?? null);
      const associatedCompany = membership?.company as { estado?: string } | { estado?: string }[] | null;
      this.companyActive.set(Array.isArray(associatedCompany)
        ? associatedCompany[0]?.estado === 'activa'
        : associatedCompany?.estado === 'activa');

      // Perfil con rol
      const { data: perfil, error: errPerfil } = await this.supabaseService.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!errPerfil && perfil) {
        this.currentProfile.set({ ...perfil, approval_status: membership?.status ?? perfil.approval_status } as Profile);
      }

      // Permisos asociados al rol
      const roleId = membership?.company_role_id;
      this.permissions.set([]);
      if (roleId && membership?.status === 'approved') {
        const { data: perms } = await this.supabaseService.client
          .from('company_role_permissions')
          .select('permission_id')
          .eq('company_id', membership.company_id)
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
        if (!this.isAuthorized()) {
          const status = this.approvalStatus();
          await this.router.navigate(['/acceso-pendiente'], { queryParams: { estado: status || 'pending' } });
        }
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
    companyId?: string
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
            company_id: companyId || ''
          }
        }
      });

      if (error) {
        return { success: false, error: this.traducirErrorAuth(error.message) };
      }

      if (data.user) {
        this.currentUser.set(data.user);
        await this.cargarPerfilYPermisos(data.user.id);
        await this.router.navigate(['/acceso-pendiente'], { queryParams: { estado: 'pending' } });
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
    this.companyId.set(null);
    this.globalRole.set(null);
    this.approvalStatus.set(null);
    this.companyActive.set(false);
    this.cache.invalidateAll();
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
    if (this.isSysAdmin() || this.isAdmin()) return true;
    return this.permissions().includes(permiso);
  }

  hasRole(rolesPermitidos: string | string[]): boolean {
    const rolActual = this.currentProfile()?.role_id;
    if (!rolActual) return false;
    const arrayRoles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
    return this.isSysAdmin() || arrayRoles.includes(rolActual);
  }

  async aprobarMiembro(userId: string, roleId: string, targetCompany?: string): Promise<void> {
    const companyId = this.isSysAdmin() ? (targetCompany || this.companyId()) : this.companyId();
    if (!companyId) throw new Error('No hay una empresa activa seleccionada.');
    const { error } = await this.supabaseService.client.rpc('approve_company_membership', {
      target_company: companyId,
      target_user: userId,
      target_role: roleId,
      approve: true
    });
    if (error) throw error;
  }

  async actualizarEstadoMiembro(userId: string, status: 'pending' | 'approved' | 'rejected' | 'disabled', targetCompany?: string): Promise<void> {
    const companyId = this.isSysAdmin() ? (targetCompany || this.companyId()) : this.companyId();
    if (!companyId) throw new Error('No hay una empresa activa seleccionada.');
    const { error } = await this.supabaseService.client.rpc('set_company_membership_status', {
      target_company: companyId,
      target_user: userId,
      target_status: status
    });
    if (error) throw error;
  }

  private traducirErrorAuth(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Correo electrónico o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Por favor confirma tu correo electrónico antes de ingresar.';
    if (msg.includes('User already registered')) return 'Ya existe una cuenta registrada con este correo electrónico.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }
}
