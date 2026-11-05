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
  modoRestablecer = false;
  modoActualizarClave = false;

  // Credenciales
  usuarioLogin = ''; // Para iniciar sesión con nombre de usuario
  usuarioSesion = ''; // Para registrarse con nombre de usuario único
  email = '';
  password = '';
  confirmarPassword = '';
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
    this.modoActualizarClave = this.route.snapshot.queryParams['actualizarClave'] === '1';
    if (this.route.snapshot.queryParams['sesion'] === 'expirada') {
      this.errorMensaje = 'Tu sesión expiró después de 30 minutos. Inicia sesión nuevamente.';
    }
    if (!this.modoActualizarClave) await this.authService.cargarEmpresas();

    // Esperar la restauración de Supabase para no mostrar el login durante una recarga.
    await this.authService.esperarInicializacion();
    const recuperacionValida = this.modoActualizarClave
      ? await this.authService.esperarRecuperacionPassword()
      : false;
    if (this.modoActualizarClave && !recuperacionValida) {
      this.modoActualizarClave = false;
      this.errorMensaje = 'El enlace de recuperación no es válido o venció. Solicita uno nuevo.';
    } else if (!this.modoActualizarClave && this.authService.isAuthenticated()) {
      await this.router.navigateByUrl(this.returnUrl);
    }
  }

  toggleModo(registro: boolean): void {
    this.isRegistro = registro;
    this.modoRestablecer = false;
    this.modoActualizarClave = false;
    this.errorMensaje = null;
    this.exitoMensaje = null;
    if (registro && this.authService.companies().length === 0) void this.authService.cargarEmpresas();
  }

  solicitarCambioClave(): void {
    this.isRegistro = false;
    this.modoRestablecer = true;
    this.modoActualizarClave = false;
    this.errorMensaje = null;
    this.exitoMensaje = null;
  }

  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMensaje = null;
    this.exitoMensaje = null;
    this.cargando = true;

    try {
      if (this.modoRestablecer) {
        if (!this.email.trim()) {
          this.errorMensaje = 'Ingresa el correo electrónico asociado a tu cuenta.';
          return;
        }

        const res = await this.authService.solicitarRestablecimientoClave(this.email);
        if (!res.success) {
          this.errorMensaje = res.error || 'No se pudo enviar el correo de restablecimiento.';
        } else {
          this.exitoMensaje = 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.';
        }
      } else if (this.modoActualizarClave) {
        if (this.password.length < 6) {
          this.errorMensaje = 'La contraseña debe tener al menos 6 caracteres.';
          return;
        }
        if (this.password !== this.confirmarPassword) {
          this.errorMensaje = 'Las contraseñas no coinciden.';
          return;
        }

        const res = await this.authService.actualizarClave(this.password);
        if (!res.success) {
          this.errorMensaje = res.error || 'No se pudo actualizar la contraseña.';
        } else {
          this.modoActualizarClave = false;
          this.password = '';
          this.confirmarPassword = '';
          this.exitoMensaje = res.error || 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.';
        }
      } else if (this.isRegistro) {
        if (!this.nombreCompleto.trim()) {
          this.errorMensaje = 'Por favor ingresa tu nombre completo.';
          this.cargando = false;
          return;
        }
        if (!this.usuarioSesion.trim()) {
          this.errorMensaje = 'Por favor ingresa un nombre de usuario para iniciar sesión.';
          this.cargando = false;
          return;
        }
        if (/\s/.test(this.usuarioSesion.trim())) {
          this.errorMensaje = 'El nombre de usuario no puede contener espacios.';
          this.cargando = false;
          return;
        }
        if (!this.email.trim()) {
          this.errorMensaje = 'Por favor ingresa tu correo electrónico para validar la cuenta.';
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
          this.usuarioSesion.trim().toLowerCase(),
          this.telefono.trim(),
          this.empresaSeleccionada
        );

        if (!res.success) {
          this.errorMensaje = res.error || 'Error al crear la cuenta.';
        } else {
          this.exitoMensaje = 'Solicitud enviada. El acceso estará disponible cuando el administrador apruebe tu incorporación.';
        }
      } else {
        if (!this.usuarioLogin.trim()) {
          this.errorMensaje = 'Por favor ingresa tu usuario.';
          this.cargando = false;
          return;
        }

        const res = await this.authService.iniciarSesion(this.usuarioLogin.trim(), this.password);

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
