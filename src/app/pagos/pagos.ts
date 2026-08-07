import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Pago, PagosService } from '../pagos.service';

@Component({
  selector: 'app-pagos',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css'
})
export class Pagos implements OnInit {
  pagos: Pago[] = [];
  cargando = true;
  error: string | null = null;

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
}
