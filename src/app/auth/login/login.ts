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
  rolSeleccionado = 'agente';

  cargando = false;
  errorMensaje: string | null = null;
  exitoMensaje: string | null = null;
  returnUrl = '/';

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    // Si ya está autenticado, redirigir
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  toggleModo(registro: boolean): void {
    this.isRegistro = registro;
    this.errorMensaje = null;
    this.exitoMensaje = null;
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

        const res = await this.authService.registrarse(
          this.email.trim(),
          this.password,
          this.nombreCompleto.trim(),
          this.telefono.trim(),
          this.rolSeleccionado
        );

        if (!res.success) {
          this.errorMensaje = res.error || 'Error al crear la cuenta.';
        } else {
          this.exitoMensaje = '¡Cuenta creada con éxito! Redirigiendo al panel...';
          setTimeout(() => this.router.navigateByUrl(this.returnUrl), 1000);
        }
      } else {
        const res = await this.authService.iniciarSesion(this.email.trim(), this.password);

        if (!res.success) {
          this.errorMensaje = res.error || 'Credenciales inválidas.';
        } else {
          this.router.navigateByUrl(this.returnUrl);
        }
      }
    } catch (err: any) {
      this.errorMensaje = err.message || 'Ocurrió un error inesperado.';
    } finally {
      this.cargando = false;
    }
  }
}
