import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Mantenimiento, MantenimientosService } from '../mantenimientos.service';

@Component({
  selector: 'app-mantenimientos',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './mantenimientos.html',
  styleUrl: './mantenimientos.css'
})
export class Mantenimientos implements OnInit {
  mantenimientos: Mantenimiento[] = [];
  cargando = true;
  error: string | null = null;

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
}
