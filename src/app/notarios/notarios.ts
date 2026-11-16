import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notario, NotariosService } from '../notarios.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-notarios', imports: [CommonModule, FormsModule],
  templateUrl: './notarios.html', styleUrl: '../inquilinos/inquilinos.css'
})
export class Notarios {
  notarios = signal<Notario[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  errorFormulario = signal<string | null>(null);
  guardando = signal(false);
  formularioAbierto = signal(false);
  editandoId: number | null = null;
  searchTerm = signal('');
  formulario = this.vacio();
  filtrados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.notarios().filter(p => `${p.nombreCompleto} ${p.cedula} ${p.matricula} ${p.jurisdiccion} ${p.direccion} ${p.telefono ?? ''} ${p.correo ?? ''}`.toLowerCase().includes(term));
  });
  constructor(private readonly service: NotariosService, public readonly auth: AuthService) {}
  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.obtenerNotarios().subscribe({
      next: r => { this.notarios.set(r.data); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar los notarios.'); this.cargando.set(false); }
    });
  }
  private vacio(): Omit<Notario, 'id'> {
    return { nombreCompleto: '', cedula: '', matricula: '', jurisdiccion: '', direccion: '', telefono: '', correo: '' };
  }
  nuevo(): void { this.cancelar(); this.formularioAbierto.set(true); }
  editar(p: Notario): void {
    this.errorFormulario.set(null);
    this.editandoId = p.id;
    this.formulario = { nombreCompleto: p.nombreCompleto, cedula: p.cedula,
      matricula: p.matricula, jurisdiccion: p.jurisdiccion, direccion: p.direccion,
      telefono: p.telefono ?? '', correo: p.correo ?? '' };
    this.formularioAbierto.set(true);
  }
  guardar(): void {
    if (this.guardando() || !this.auth.hasPermission(this.editandoId === null ? 'alquileres:create' : 'alquileres:update')) return;
    const datos = { ...this.formulario, nombreCompleto: this.formulario.nombreCompleto.trim(),
      cedula: this.formulario.cedula.trim(), matricula: this.formulario.matricula.trim(), jurisdiccion: this.formulario.jurisdiccion.trim(),
      telefono: this.formulario.telefono?.trim() ?? '', correo: this.formulario.correo?.trim() ?? '',
      direccion: this.formulario.direccion.trim() };
    if (!datos.nombreCompleto || !datos.cedula || !datos.matricula || !datos.jurisdiccion || !datos.direccion) {
      this.errorFormulario.set('Completa el nombre, cédula, matrícula, jurisdicción y dirección del despacho.'); return;
    }
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
      this.errorFormulario.set('Indica un correo electrónico válido.'); return;
    }
    this.guardando.set(true); this.errorFormulario.set(null);
    const solicitud = this.editandoId === null ? this.service.crear(datos) : this.service.actualizar(this.editandoId, datos);
    solicitud.subscribe({
      next: () => { this.guardando.set(false); this.cancelar(); this.error.set(null); this.ngOnInit(); },
      error: e => { this.guardando.set(false); this.errorFormulario.set(e?.code === '23505'
        ? 'Ya existe un notario con esa cédula o matrícula.' : 'No se pudo guardar el notario. Intenta nuevamente.'); }
    });
  }
  eliminar(p: Notario): void {
    if (!this.auth.hasPermission('alquileres:delete')) return;
    if (!confirm(`¿Eliminar a ${p.nombreCompleto}?`)) return;
    this.service.eliminar(p.id).subscribe({
      next: () => { this.error.set(null); this.ngOnInit(); },
      error: e => this.error.set(e?.code === '23503' ? 'El notario tiene contratos asociados y no se puede eliminar.' : 'No se pudo eliminar el notario.')
    });
  }
  @HostListener('document:keydown.escape')
  cancelar(): void {
    if (this.guardando()) return;
    this.formularioAbierto.set(false); this.editandoId = null;
    this.errorFormulario.set(null); this.formulario = this.vacio();
  }
}
