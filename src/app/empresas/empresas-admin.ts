import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../supabase.service';

interface EmpresaAdmin {
  id: string;
  nombre: string;
  estado: 'activa' | 'suspendida';
  created_at: string;
}

interface SolicitudEmpresa {
  user_id: string;
  company_id: string;
  role_id: string;
  email?: string;
  full_name?: string;
}

@Component({
  selector: 'app-empresas-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="companies-page">
      <header class="page-heading">
        <div><h1>Empresas</h1><p>Administra los espacios de trabajo de la plataforma.</p></div>
        <button type="button" (click)="crearEmpresa()" [disabled]="guardando() || !nuevoNombre.trim()">Crear empresa</button>
      </header>
      <div class="create-row">
        <label for="company-name">Nombre de la nueva empresa</label>
        <input id="company-name" [(ngModel)]="nuevoNombre" placeholder="Ej. Inmobiliaria del Caribe" (keyup.enter)="crearEmpresa()">
      </div>
      <p *ngIf="mensaje()" class="notice success">{{ mensaje() }}</p>
      <p *ngIf="error()" class="notice error">{{ error() }}</p>
      <p *ngIf="cargando()">Cargando empresas…</p>
      <section class="company-list" *ngIf="!cargando()">
        <article class="company-card" *ngFor="let empresa of empresas()">
          <div class="company-info">
            <input [ngModel]="empresa.nombre" (ngModelChange)="empresa.nombre = $event" [attr.aria-label]="'Nombre de ' + empresa.nombre">
            <span [class.suspended]="empresa.estado === 'suspendida'">{{ empresa.estado === 'activa' ? 'Activa' : 'Suspendida' }}</span>
          </div>
          <div class="company-actions">
            <button type="button" class="secondary" (click)="guardarEmpresa(empresa)" [disabled]="guardando()">Guardar</button>
            <button type="button" [class.danger]="empresa.estado === 'activa'" (click)="cambiarEstado(empresa)" [disabled]="guardando()">
              {{ empresa.estado === 'activa' ? 'Suspender' : 'Reactivar' }}
            </button>
          </div>
        </article>
        <section class="requests-card" *ngFor="let empresa of empresas()">
          <h2>Solicitudes para {{ empresa.nombre }}</h2>
          <div class="request-row" *ngFor="let request of solicitudes()[empresa.id] || []">
            <div><strong>{{ request.full_name || 'Usuario' }}</strong><small>{{ request.email }}</small></div>
            <select [(ngModel)]="request.role_id" aria-label="Rol para la solicitud">
              <option value="admin">Administrador de empresa</option>
              <option value="agente">Agente</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="cliente">Cliente</option>
            </select>
            <button type="button" (click)="resolverSolicitud(request, true)" [disabled]="guardando()">Aprobar</button>
            <button type="button" class="secondary" (click)="resolverSolicitud(request, false)" [disabled]="guardando()">Rechazar</button>
          </div>
          <p *ngIf="!(solicitudes()[empresa.id]?.length)" class="empty">Sin solicitudes pendientes.</p>
        </section>
        <p *ngIf="empresas().length === 0" class="empty">Aún no hay empresas registradas.</p>
      </section>
    </main>
  `,
  styles: [`
    .companies-page { max-width: 1100px; margin: 0 auto; padding: 32px; color: #17243b; }
    .page-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }
    h1 { margin: 0 0 6px; font-size: 30px; } .page-heading p { margin: 0; color: #6b7b92; }
    button { border: 0; border-radius: 9px; background: #0785c9; color: white; padding: 10px 16px; font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; } button.secondary { background: #eaf1f7; color: #263a55; }
    button.danger { background: #fff0f0; color: #ba3030; }
    .create-row { display: flex; align-items: center; gap: 14px; padding: 18px; border: 1px solid #e2e9f1; border-radius: 12px; background: white; }
    input { min-width: 0; padding: 10px 12px; border: 1px solid #dce4ed; border-radius: 8px; font: inherit; }
    .create-row input { flex: 1; }
    .company-list { display: grid; gap: 12px; margin-top: 20px; }
    .company-card { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 18px; border: 1px solid #e2e9f1; border-radius: 12px; background: white; }
    .company-info { display: flex; align-items: center; gap: 12px; flex: 1; } .company-info input { flex: 1; font-weight: 600; }
    .company-info span { color: #168451; background: #e7f7ef; padding: 5px 10px; border-radius: 99px; font-size: 13px; }
    .company-info span.suspended { color: #9a5a14; background: #fff3df; }
    .company-actions { display: flex; gap: 8px; } .notice { padding: 12px 14px; border-radius: 9px; }
    .requests-card { padding: 16px 18px; border: 1px solid #e2e9f1; border-radius: 12px; background: white; }
    .requests-card h2 { margin: 0 0 12px; font-size: 17px; }
    .request-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid #edf1f5; }
    .request-row div { display: grid; flex: 1; gap: 4px; } .request-row small { color: #6b7b92; }
    .request-row select { padding: 9px; border: 1px solid #dce4ed; border-radius: 8px; font: inherit; }
    .success { color: #12683d; background: #e9f8ef; } .error { color: #a62525; background: #fff0f0; }
    .empty { color: #74839a; text-align: center; padding: 30px; }
    @media (max-width: 640px) { .companies-page { padding: 20px; } .page-heading, .company-card { align-items: stretch; flex-direction: column; } .create-row { align-items: stretch; flex-direction: column; } .company-info { align-items: stretch; flex-direction: column; } }
  `]
})
export class EmpresasAdmin implements OnInit {
  readonly empresas = signal<EmpresaAdmin[]>([]);
  readonly solicitudes = signal<Record<string, SolicitudEmpresa[]>>({});
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  nuevoNombre = '';

  constructor(private readonly supabase: SupabaseService) {}

  ngOnInit(): void { void this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    const { data, error } = await this.supabase.client.from('companies').select('id,nombre,estado,created_at').order('nombre');
    if (error) this.error.set(error.message);
    else {
      this.empresas.set((data || []) as EmpresaAdmin[]);
      const { data: memberships, error: membershipError } = await this.supabase.client
        .from('company_memberships').select('company_id,user_id,role_id').eq('status', 'pending');
      if (membershipError) this.error.set(membershipError.message);
      else {
        const ids = [...new Set((memberships || []).map((m: any) => m.user_id))];
        const { data: profiles } = ids.length
          ? await this.supabase.client.from('profiles').select('id,email,full_name').in('id', ids)
          : { data: [] };
        const grouped: Record<string, SolicitudEmpresa[]> = {};
        for (const m of memberships || []) {
          const profile = profiles?.find((p: any) => p.id === m.user_id);
          (grouped[m.company_id] ||= []).push({ ...m, email: profile?.email, full_name: profile?.full_name });
        }
        this.solicitudes.set(grouped);
      }
    }
    this.cargando.set(false);
  }

  async crearEmpresa(): Promise<void> {
    const nombre = this.nuevoNombre.trim();
    if (nombre.length < 2 || this.guardando()) return;
    this.guardando.set(true); this.error.set(null);
    const { error } = await this.supabase.client.rpc('create_company', { company_name: nombre });
    if (error) this.error.set(error.message);
    else { this.nuevoNombre = ''; this.mensaje.set('Empresa creada con roles iniciales.'); await this.cargar(); }
    this.guardando.set(false);
  }

  async guardarEmpresa(empresa: EmpresaAdmin): Promise<void> {
    this.guardando.set(true); this.error.set(null);
    const { error } = await this.supabase.client.rpc('update_company', {
      target_company: empresa.id, company_name: empresa.nombre.trim(), target_status: empresa.estado
    });
    if (error) this.error.set(error.message);
    else this.mensaje.set('Datos de empresa actualizados.');
    this.guardando.set(false);
  }

  async cambiarEstado(empresa: EmpresaAdmin): Promise<void> {
    empresa.estado = empresa.estado === 'activa' ? 'suspendida' : 'activa';
    await this.guardarEmpresa(empresa);
  }

  async resolverSolicitud(request: SolicitudEmpresa, aprobar: boolean): Promise<void> {
    this.guardando.set(true); this.error.set(null);
    const result = aprobar
      ? await this.supabase.client.rpc('approve_company_membership', {
          target_company: request.company_id, target_user: request.user_id,
          target_role: request.role_id, approve: true
        })
      : await this.supabase.client.rpc('set_company_membership_status', {
          target_company: request.company_id, target_user: request.user_id, target_status: 'rejected'
        });
    if (result.error) this.error.set(result.error.message);
    else { this.mensaje.set(aprobar ? 'Usuario aprobado.' : 'Solicitud rechazada.'); await this.cargar(); }
    this.guardando.set(false);
  }
}
