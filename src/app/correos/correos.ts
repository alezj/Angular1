import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { EmailService } from '../email.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';

@Component({
  selector: 'app-correos',
  imports: [CommonModule, FormsModule],
  templateUrl: './correos.html',
  styleUrl: './correos.css'
})
export class Correos implements OnInit {
  inquilinos: Inquilino[] = [];
  formulario = { destinatario: '', asunto: '', mensaje: '' };
  destinatarioSeleccionado = '';
  correoAlternativo = '';
  cargando = true;
  enviando = false;
  error: string | null = null;
  confirmacion: string | null = null;

  constructor(
    private readonly inquilinosService: InquilinosService,
    private readonly emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.inquilinosService.obtenerInquilinos().subscribe({
      next: (respuesta) => {
        this.inquilinos = (respuesta.data ?? []).filter((inquilino) => this.obtenerCorreo(inquilino));
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de correos de inquilinos.';
        this.cargando = false;
      }
    });
  }

  obtenerCorreo(inquilino: Inquilino): string {
    return (inquilino.correo ?? inquilino.email ?? '').trim();
  }

  seleccionarDestinatario(): void {
    this.formulario.destinatario = this.destinatarioSeleccionado === '__otro__'
      ? this.correoAlternativo
      : this.destinatarioSeleccionado;
  }

  actualizarCorreoAlternativo(): void {
    if (this.destinatarioSeleccionado === '__otro__') {
      this.formulario.destinatario = this.correoAlternativo;
    }
  }

  enviar(): void {
    this.error = null;
    this.confirmacion = null;
    this.enviando = true;

    this.emailService.enviar({
      destinatario: this.formulario.destinatario,
      asunto: this.formulario.asunto,
      contenido: this.formulario.mensaje
    }).pipe(
      timeout(30000),
      finalize(() => this.enviando = false)
    ).subscribe({
      next: (respuesta) => {
        this.confirmacion = respuesta.mensaje || 'Correo enviado correctamente.';
        this.formulario = { destinatario: '', asunto: '', mensaje: '' };
        this.destinatarioSeleccionado = '';
        this.correoAlternativo = '';
      },
      error: (respuesta) => {
        this.error = respuesta.name === 'TimeoutError'
          ? 'El servidor tardó demasiado en responder. Verifica el backend y la configuración SMTP.'
          : respuesta.error?.detail || respuesta.error?.error || 'No se pudo enviar el correo.';
      }
    });
  }
}