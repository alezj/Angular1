import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pago, PagosService } from '../pagos.service';

@Component({
  selector: 'app-pagos',
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css'
})
export class Pagos implements OnInit {
  pagos: Pago[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formulario: Omit<Pago, 'id'> = { idInquilino: '', fechaPago: '', monto: '' };
  searchTerm = '';

  get filteredPagos(): Pago[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.pagos;
    return this.pagos.filter((pago) =>
      `${pago.idInquilino} ${pago.fechaPago} ${pago.monto}`.toLowerCase().includes(term)
    );
  }

  constructor(private readonly pagosService: PagosService) {}

  ngOnInit(): void {
    this.pagosService.obtenerPagos().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.pagos = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los pagos.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }
  guardar(): void { const r = this.editandoId === null ? this.pagosService.crear(this.formulario) : this.pagosService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  editar(x: Pago): void { this.editandoId = x.id; this.formulario = { idInquilino: x.idInquilino, fechaPago: x.fechaPago.substring(0, 10), monto: x.monto }; }
  eliminar(id: number): void { if (confirm('¿Eliminar este pago?')) this.pagosService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { idInquilino: '', fechaPago: '', monto: '' }; }
}
