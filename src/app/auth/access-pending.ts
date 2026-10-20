import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-access-pending',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="access-state">
      <section class="access-card">
        <span class="access-mark" aria-hidden="true">⏳</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <button type="button" (click)="authService.cerrarSesion()">Cerrar sesión</button>
      </section>
    </main>
  `,
  styles: [`
    .access-state { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f4f7fb; }
    .access-card { width: min(100%, 480px); padding: 36px; border: 1px solid #e1e8f0; border-radius: 20px; background: white; text-align: center; box-shadow: 0 12px 36px #172b4d12; }
    .access-mark { font-size: 36px; }
    h1 { margin: 16px 0 8px; color: #12213a; font-size: 26px; }
    p { color: #61728b; line-height: 1.6; }
    button { margin-top: 16px; padding: 11px 18px; border: 0; border-radius: 10px; background: #087fca; color: white; font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #53b8f2; outline-offset: 3px; }
  `]
})
export class AccessPending {
  readonly status: string;

  constructor(
    private readonly route: ActivatedRoute,
    public readonly authService: AuthService
  ) {
    this.status = this.route.snapshot.queryParamMap.get('estado') || 'pending';
  }

  get title(): string {
    if (this.status === 'rejected') return 'Solicitud no aprobada';
    if (this.status === 'disabled') return 'Acceso suspendido';
    return 'Solicitud pendiente de aprobación';
  }

  get description(): string {
    if (this.status === 'rejected') return 'El administrador no aprobó la solicitud de incorporación. Contacta al administrador de tu empresa si necesitas más información.';
    if (this.status === 'disabled') return 'Tu acceso al espacio de la empresa está suspendido. Contacta al administrador para revisarlo.';
    return 'Tu cuenta se creó correctamente. Un administrador debe aprobar tu incorporación antes de que puedas consultar los datos de la empresa.';
  }
}
