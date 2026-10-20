import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  isRegistro = false;

  // Credenciales
  email = '';
  password = '';
  nombreCompleto = '';
  telefono = '';
  empresaSeleccionada = '';

  cargando = false;
  errorMensaje: string | null = null;
  exitoMensaje: string | null = null;
  returnUrl = '/';

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    await this.authService.cargarEmpresas();

    // Esperar la restauración de Supabase para no mostrar el login durante una recarga.
    await this.authService.esperarInicializacion();
    if (this.authService.isAuthenticated()) {
      await this.router.navigateByUrl(this.returnUrl);
    }
  }

  toggleModo(registro: boolean): void {
    this.isRegistro = registro;
    this.errorMensaje = null;
    this.exitoMensaje = null;
    if (registro && this.authService.companies().length === 0) void this.authService.cargarEmpresas();
  }

  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMensaje = null;
    this.exitoMensaje = null;
    this.cargando = true;

    try {
      if (this.isRegistro) {
        if (!this.nombreCompleto.trim()) {
          this.errorMensaje = 'Por favor ingresa tu nombre completo.';
          this.cargando = false;
          return;
        }
        if (!this.empresaSeleccionada) {
          this.errorMensaje = 'Selecciona la empresa a la que solicitas incorporarte.';
          this.cargando = false;
          return;
        }

        const res = await this.authService.registrarse(
          this.email.trim(),
          this.password,
          this.nombreCompleto.trim(),
          this.telefono.trim(),
          this.empresaSeleccionada
        );

        if (!res.success) {
          this.errorMensaje = res.error || 'Error al crear la cuenta.';
        } else {
          this.exitoMensaje = 'Solicitud enviada. El acceso estará disponible cuando el administrador apruebe tu incorporación.';
        }
      } else {
        const res = await this.authService.iniciarSesion(this.email.trim(), this.password);

        if (!res.success) {
          this.errorMensaje = res.error || 'Credenciales inválidas.';
        } else {
          if (this.authService.isAuthorized()) this.router.navigateByUrl(this.returnUrl);
        }
      }
    } catch (err: any) {
      this.errorMensaje = err.message || 'Ocurrió un error inesperado.';
    } finally {
      this.cargando = false;
    }
  }
}
