import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Inquilino, InquilinosService } from '../inquilinos.service';

@Component({
  selector: 'app-inquilinos',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './inquilinos.html',
  styleUrl: './inquilinos.css'
})
export class Inquilinos implements OnInit {
  inquilinos: Inquilino[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formulario: Omit<Inquilino, 'id'> = { nombreApellido: '', fechaInicioContrato: '', fechaPagos: 1 };

  constructor(private readonly inquilinosService: InquilinosService) {}

  ngOnInit(): void {
    this.inquilinosService.obtenerInquilinos().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.inquilinos = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los inquilinos.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }
  guardar(): void { const r = this.editandoId === null ? this.inquilinosService.crear(this.formulario) : this.inquilinosService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  editar(x: Inquilino): void { this.editandoId = x.id; this.formulario = { nombreApellido: x.nombreApellido, fechaInicioContrato: x.fechaInicioContrato.substring(0, 10), fechaPagos: x.fechaPagos }; }
  eliminar(id: number): void { if (confirm('¿Eliminar este inquilino?')) this.inquilinosService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { nombreApellido: '', fechaInicioContrato: '', fechaPagos: 1 }; }
}
