import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Propietario, PropietariosService } from '../propietarios.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-propietarios', imports: [CommonModule, FormsModule],
  templateUrl: './propietarios.html', styleUrl: '../inquilinos/inquilinos.css'
})
export class Propietarios {
  propietarios = signal<Propietario[]>([]);
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
    return this.propietarios().filter(p => `${p.nombreCompleto} ${p.cedula} ${p.nacionalidad} ${p.direccion} ${p.telefono ?? ''} ${p.correo ?? ''}`.toLowerCase().includes(term));
  });
  constructor(private readonly service: PropietariosService, public readonly auth: AuthService) {}
  ngOnInit(): void {
    this.cargando.set(true);
    this.service.obtenerPropietarios().subscribe({
      next: r => { this.propietarios.set(r.data); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar los propietarios.'); this.cargando.set(false); }
    });
  }
  private vacio(): Omit<Propietario, 'id'> {
    return { nombreCompleto: '', cedula: '', nacionalidad: '', direccion: '', mayorEdad: false, telefono: '', correo: '' };
  }
  nuevo(): void { this.cancelar(); this.formularioAbierto.set(true); }
  editar(p: Propietario): void {
    this.errorFormulario.set(null);
    this.editandoId = p.id;
    this.formulario = { nombreCompleto: p.nombreCompleto, cedula: p.cedula,
      nacionalidad: p.nacionalidad, direccion: p.direccion, mayorEdad: p.mayorEdad,
      telefono: p.telefono ?? '', correo: p.correo ?? '' };
    this.formularioAbierto.set(true);
  }
  guardar(): void {
    if (this.guardando()) return;
    const datos = { ...this.formulario, nombreCompleto: this.formulario.nombreCompleto.trim(),
      cedula: this.formulario.cedula.trim(), nacionalidad: this.formulario.nacionalidad.trim(),
      direccion: this.formulario.direccion.trim() };
    if (!datos.nombreCompleto || !datos.cedula || !datos.nacionalidad || !datos.direccion || !datos.mayorEdad) {
      this.errorFormulario.set('Completa los datos de identidad, domicilio y mayoría de edad.'); return;
    }
    this.guardando.set(true); this.errorFormulario.set(null);
    const solicitud = this.editandoId === null ? this.service.crear(datos) : this.service.actualizar(this.editandoId, datos);
    solicitud.subscribe({
      next: () => { this.guardando.set(false); this.cancelar(); this.error.set(null); this.ngOnInit(); },
      error: e => { this.guardando.set(false); this.errorFormulario.set(e?.code === '23505'
        ? 'Ya existe un propietario con esa cédula.' : 'No se pudo guardar el propietario. Intenta nuevamente.'); }
    });
  }
  eliminar(p: Propietario): void {
    if (!confirm(`¿Eliminar a ${p.nombreCompleto}?`)) return;
    this.service.eliminar(p.id).subscribe({
      next: () => { this.error.set(null); this.ngOnInit(); },
      error: e => this.error.set(e?.code === '23503' ? 'El propietario tiene contratos asociados y no se puede eliminar.' : 'No se pudo eliminar el propietario.')
    });
  }
  cancelar(): void {
    if (this.guardando()) return;
    this.formularioAbierto.set(false); this.editandoId = null;
    this.errorFormulario.set(null); this.formulario = this.vacio();
  }
}
