import { Component, OnInit } from '@angular/core';
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
  propiedades: Propiedad[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formulario: Omit<Propiedad, 'id'> = { nombre: '', direccion: '', estado: 1, precioMensual: 0, notas: '' };

  constructor(private readonly propiedadesService: PropiedadesService) {}

  ngOnInit(): void {
    this.propiedadesService.obtenerPropiedades().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.propiedades = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener las propiedades.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }

  guardar(): void {
    const accion = this.editandoId === null ? this.propiedadesService.crear(this.formulario) : this.propiedadesService.actualizar(this.editandoId, this.formulario);
    accion.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar la propiedad.' });
  }
  editar(propiedad: Propiedad): void { this.editandoId = propiedad.id; this.formulario = { ...propiedad }; }
  eliminar(id: number): void { if (confirm('¿Eliminar esta propiedad?')) this.propiedadesService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar la propiedad.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { nombre: '', direccion: '', estado: 1, precioMensual: 0, notas: '' }; }
}
