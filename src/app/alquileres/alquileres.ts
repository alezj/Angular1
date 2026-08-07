import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alquiler, AlquileresService } from '../alquileres.service';

@Component({
  selector: 'app-alquileres',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './alquileres.html',
  styleUrl: './alquileres.css'
})
export class Alquileres implements OnInit {
  alquileres: Alquiler[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | string | null = null;
  formulario: Omit<Alquiler, 'id'> = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '' };

  constructor(private readonly alquileresService: AlquileresService) {}

  ngOnInit(): void {
    this.alquileresService.obtenerAlquileres().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.alquileres = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los alquileres.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }
  guardar(): void { const r = this.editandoId === null ? this.alquileresService.crear(this.formulario) : this.alquileresService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  editar(x: Alquiler): void { this.editandoId = x.id; this.formulario = { propiedadID: x.propiedadID, inquilinoID: x.inquilinoID, fechaInicio: x.fechaInicio.substring(0, 10), fechaFin: x.fechaFin.substring(0, 10) }; }
  eliminar(id: number | string): void { if (id && confirm('¿Eliminar este alquiler?')) this.alquileresService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '' }; }
}
