import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Permission, Profile, Role } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  usuarios = signal<Profile[]>([]);
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  rolePermissionIds = signal<Record<string, string[]>>({});
  companies = signal<Array<{ id: string; name: string }>>([]);
  selectedCompanyId = signal<string | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);
  filtroTexto = signal<string>('');
  usuarioEditando = signal<Profile | null>(null);
  formularioEdicion = signal({ full_name: '', phone: '' });
  guardandoEdicion = signal(false);

  constructor(
    private readonly supabaseService: SupabaseService,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      // 1. Cargar roles
      if (this.authService.isSysAdmin()) {
        const { data: companies, error: companyError } = await this.supabaseService.client
          .from('companies').select('id,name').order('name');
        if (companyError) throw companyError;
        this.companies.set(companies || []);
        if (!this.selectedCompanyId()) this.selectedCompanyId.set(this.authService.companyId() || companies?.[0]?.id || null);
      } else {
        this.selectedCompanyId.set(this.authService.companyId());
      }
      const companyId = this.selectedCompanyId();
      if (!companyId) throw new Error('No hay una empresa activa asignada a tu cuenta.');
      const { data: rolesData, error: errRoles } = await this.supabaseService.client
        .from('roles').select('id,name,description').order('id');
      if (errRoles) throw errRoles;
      this.roles.set((rolesData || []) as Role[]);

      const [{ data: permissionData, error: permissionError }, { data: rolePermissionData, error: rolePermissionError }] = await Promise.all([
        this.supabaseService.client.from('permissions').select('id,module,description').order('module').order('id'),
        this.supabaseService.client.from('company_role_permissions').select('role_id,permission_id').eq('company_id', companyId)
      ]);
      if (permissionError) throw permissionError;
      if (rolePermissionError) throw rolePermissionError;
      this.permissions.set((permissionData || []) as Permission[]);
      const configured: Record<string, string[]> = {};
      for (const mapping of rolePermissionData || []) {
        (configured[mapping.role_id] ||= []).push(mapping.permission_id);
      }
      this.rolePermissionIds.set(configured);

      // 2. Cargar perfiles con rol
      const { data: memberships, error: membershipError } = await this.supabaseService.client
        .from('company_memberships').select('user_id,role,app_role_id,status').eq('company_id', companyId);
      if (membershipError) throw membershipError;
      const userIds = (memberships || []).map((m: any) => m.user_id);
      const { data: profilesData, error: errProfiles } = userIds.length
        ? await this.supabaseService.client.from('profiles').select('*').in('id', userIds).order('created_at', { ascending: false })
        : { data: [], error: null };
      if (errProfiles) throw errProfiles;
      const membershipByUser = new Map((memberships || []).map((m: any) => [m.user_id, m]));
      this.usuarios.set((profilesData || []).map((profile: any) => {
        const membership = membershipByUser.get(profile.id);
        return {
          ...profile,
          role_id: membership?.app_role_id || membership?.role || profile.role_id,
          is_active: membership?.status === 'approved',
          approval_status: membership?.status || profile.approval_status
        } as Profile;
      }));
    } catch (err: any) {
      this.error.set(err.message || 'Error al cargar los usuarios.');
    } finally {
      this.cargando.set(false);
      this.cdr.markForCheck();
    }
  }

  seleccionarEmpresa(companyId: string): void {
    this.selectedCompanyId.set(companyId);
    this.cargarDatos();
  }

  tienePermisoRol(roleId: string, permissionId: string): boolean {
    return this.rolePermissionIds()[roleId]?.includes(permissionId) ?? false;
  }

  async cambiarPermisoRol(roleId: string, permissionId: string, checked: boolean): Promise<void> {
    const companyId = this.selectedCompanyId();
    if (!companyId) return;
    const query = this.supabaseService.client.from('company_role_permissions');
    const result = checked
      ? await query.insert({ company_id: companyId, role_id: roleId, permission_id: permissionId })
      : await query.delete().eq('company_id', companyId).eq('role_id', roleId).eq('permission_id', permissionId);
    if (result.error) {
      this.error.set(result.error.message);
      return;
    }
    this.rolePermissionIds.update((current) => {
      const values = new Set(current[roleId] || []);
      checked ? values.add(permissionId) : values.delete(permissionId);
      return { ...current, [roleId]: [...values] };
    });
  }


  usuariosFiltrados(): Profile[] {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.usuarios();
    return this.usuarios().filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role_id || '').toLowerCase().includes(q)
    );
  }

  conteoPorRol(rol: string): number {
    return this.usuarios().filter((u) => u.role_id === rol).length;
  }

  abrirEdicion(usuario: Profile): void {
    this.usuarioEditando.set(usuario);
    this.formularioEdicion.set({ full_name: usuario.full_name || '', phone: usuario.phone || '' });
    this.error.set(null);
  }

  actualizarCampoEdicion(campo: 'full_name' | 'phone', valor: string): void {
    this.formularioEdicion.update((actual) => ({ ...actual, [campo]: valor }));
  }

  cerrarEdicion(): void {
    if (this.guardandoEdicion()) return;
    this.usuarioEditando.set(null);
  }

  async guardarEdicion(): Promise<void> {
    const usuario = this.usuarioEditando();
    if (!usuario || this.guardandoEdicion()) return;

    const datos = this.formularioEdicion();
    this.guardandoEdicion.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .update({
          full_name: datos.full_name.trim(),
          phone: datos.phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', usuario.id)
        .select('*')
        .single();

      if (error) throw error;

      const perfilActualizado = data as Profile;
      this.usuarios.update((lista) => lista.map((actual) => actual.id === usuario.id ? perfilActualizado : actual));
      if (this.authService.currentProfile()?.id === usuario.id) {
        this.authService.currentProfile.set(perfilActualizado);
      }
      this.usuarioEditando.set(null);
      this.mensajeExito.set(`Datos de ${perfilActualizado.full_name || perfilActualizado.email} actualizados.`);
      setTimeout(() => this.mensajeExito.set(null), 3000);
    } catch (err: any) {
      this.error.set(err.message || 'No se pudieron guardar los cambios del usuario.');
    } finally {
      this.guardandoEdicion.set(false);
      this.cdr.markForCheck();
    }
  }

  async cambiarRol(usuario: Profile, nuevoRol: string): Promise<void> {
    if (usuario.role_id === nuevoRol) return;

    try {
      await this.authService.aprobarMiembro(usuario.id, nuevoRol, this.selectedCompanyId() || undefined);

      usuario.role_id = nuevoRol;
      usuario.role = this.roles().find((r) => r.id === nuevoRol);
      usuario.is_active = true;
      usuario.approval_status = 'approved';
      this.mensajeExito.set(`Rol de ${usuario.full_name || usuario.email} actualizado a ${nuevoRol}.`);
      setTimeout(() => this.mensajeExito.set(null), 3000);
    } catch (err: any) {
      this.error.set(err.message || 'No se pudo cambiar el rol.');
      setTimeout(() => this.error.set(null), 4000);
    }
    this.cdr.markForCheck();
  }

  async toggleEstado(usuario: Profile): Promise<void> {
    const nuevoEstado = !usuario.is_active;
    try {
      await this.authService.actualizarEstadoMiembro(
        usuario.id, nuevoEstado ? 'approved' : 'disabled', this.selectedCompanyId() || undefined
      );

      usuario.is_active = nuevoEstado;
      usuario.approval_status = nuevoEstado ? 'approved' : 'disabled';
      this.mensajeExito.set(`Usuario ${nuevoEstado ? 'activado' : 'suspendido'} exitosamente.`);
      setTimeout(() => this.mensajeExito.set(null), 3000);
    } catch (err: any) {
      this.error.set(err.message || 'Error al cambiar el estado del usuario.');
    }
    this.cdr.markForCheck();
  }
}
