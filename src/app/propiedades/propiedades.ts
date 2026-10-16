import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Propiedad, PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-propiedades',
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './propiedades.html',
  styleUrl: './propiedades.css'
})
export class Propiedades implements OnInit {
  readonly estados = [{ id: 1, nombre: 'Disponible' }, { id: 2, nombre: 'Alquilada' }, { id: 3, nombre: 'Mantenimiento' }, { id: 4, nombre: 'Inactiva' }];
  propiedades: Propiedad[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formularioAbierto = false;
  vista: 'tarjetas' | 'tabla' = 'tarjetas';
  searchTerm = '';
  formulario: Omit<Propiedad, 'id'> = { nombre: '', direccion: '', estado: 1, precioMensual: 0, notas: '' };

  get propiedadesFiltradas(): Propiedad[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.propiedades;
    return this.propiedades.filter((propiedad) =>
      `${propiedad.nombre} ${propiedad.direccion} ${propiedad.notas}`.toLowerCase().includes(term)
    );
  }

  constructor(private readonly propiedadesService: PropiedadesService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.propiedadesService.obtenerPropiedades().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.propiedades = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener las propiedades.';
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  guardar(): void {
    const accion = this.editandoId === null ? this.propiedadesService.crear(this.formulario) : this.propiedadesService.actualizar(this.editandoId, this.formulario);
    accion.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar la propiedad.' });
  }
  nuevo(): void { this.cancelar(); this.formularioAbierto = true; }
  editar(propiedad: Propiedad): void { this.editandoId = propiedad.id; this.formulario = { ...propiedad }; this.formularioAbierto = true; }
  eliminar(id: number): void { if (confirm('¿Eliminar esta propiedad?')) this.propiedadesService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar la propiedad.' }); }
  cancelar(): void { this.editandoId = null; this.formularioAbierto = false; this.formulario = { nombre: '', direccion: '', estado: 1, precioMensual: 0, notas: '' }; }
  nombreEstado(id: number): string { return this.estados.find(e => e.id === id)?.nombre ?? `Sin definir (${id})`; }
}
