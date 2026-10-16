import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile, Role } from '../auth/auth.models';
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
      const { data: rolesData, error: errRoles } = await this.supabaseService.client
        .from('roles')
        .select('*')
        .order('id');
      if (errRoles) throw errRoles;
      this.roles.set((rolesData || []) as Role[]);

      // 2. Cargar perfiles con rol
      const { data: profilesData, error: errProfiles } = await this.supabaseService.client
        .from('profiles')
        .select('*, role:roles(*)')
        .order('created_at', { ascending: false });
      if (errProfiles) throw errProfiles;

      this.usuarios.set((profilesData || []) as Profile[]);
    } catch (err: any) {
      this.error.set(err.message || 'Error al cargar los usuarios.');
    } finally {
      this.cargando.set(false);
      this.cdr.markForCheck();
    }
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
        .select('*, role:roles(*)')
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
      const { error } = await this.supabaseService.client
        .from('profiles')
        .update({ role_id: nuevoRol, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      if (error) throw error;

      usuario.role_id = nuevoRol;
      usuario.role = this.roles().find((r) => r.id === nuevoRol);
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
      const { error } = await this.supabaseService.client
        .from('profiles')
        .update({ is_active: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      if (error) throw error;

      usuario.is_active = nuevoEstado;
      this.mensajeExito.set(`Usuario ${nuevoEstado ? 'activado' : 'suspendido'} exitosamente.`);
      setTimeout(() => this.mensajeExito.set(null), 3000);
    } catch (err: any) {
      this.error.set(err.message || 'Error al cambiar el estado del usuario.');
    }
    this.cdr.markForCheck();
  }
}
