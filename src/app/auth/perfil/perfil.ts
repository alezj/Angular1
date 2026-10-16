import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  nombreCompleto = '';
  telefono = '';
  avatarUrl = '';

  guardando = false;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  constructor(public readonly authService: AuthService) {}

  ngOnInit(): void {
    const profile = this.authService.currentProfile();
    if (profile) {
      this.nombreCompleto = profile.full_name || '';
      this.telefono = profile.phone || '';
      this.avatarUrl = profile.avatar_url || '';
    }
  }

  async guardarCambios(): Promise<void> {
    this.guardando = true;
    this.mensajeExito = null;
    this.mensajeError = null;

    const res = await this.authService.actualizarPerfil({
      full_name: this.nombreCompleto.trim(),
      phone: this.telefono.trim(),
      avatar_url: this.avatarUrl.trim()
    });

    this.guardando = false;
    if (res.success) {
      this.mensajeExito = 'Perfil actualizado correctamente.';
    } else {
      this.mensajeError = res.error || 'No se pudo actualizar el perfil.';
    }
  }
}
