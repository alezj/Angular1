import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mantenimiento, MantenimientosService } from '../mantenimientos.service';

@Component({
  selector: 'app-mantenimientos',
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './mantenimientos.html',
  styleUrl: './mantenimientos.css'
})
export class Mantenimientos implements OnInit {
  readonly estados = [{ id: 1, nombre: 'Pendiente' }, { id: 2, nombre: 'En proceso' }, { id: 3, nombre: 'Finalizado' }, { id: 4, nombre: 'Cancelado' }];
  mantenimientos: Mantenimiento[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formulario: Omit<Mantenimiento, 'id'> = { propiedadID: 0, descripcion: '', fecha: '', costo: 0, estado: 1 };

  constructor(private readonly mantenimientosService: MantenimientosService) {}

  ngOnInit(): void {
    this.mantenimientosService.obtenerMantenimientos().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.mantenimientos = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los mantenimientos.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }
  guardar(): void { const r = this.editandoId === null ? this.mantenimientosService.crear(this.formulario) : this.mantenimientosService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  editar(x: Mantenimiento): void { this.editandoId = x.id; this.formulario = { ...x, fecha: x.fecha.substring(0, 10) }; }
  eliminar(id: number): void { if (confirm('¿Eliminar este mantenimiento?')) this.mantenimientosService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { propiedadID: 0, descripcion: '', fecha: '', costo: 0, estado: 1 }; }
  nombreEstado(id: number): string { return this.estados.find(e => e.id === id)?.nombre ?? `Sin definir (${id})`; }
}
