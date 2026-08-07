import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Propiedad, PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-propiedades',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './propiedades.html',
  styleUrl: './propiedades.css'
})
export class Propiedades implements OnInit {
  propiedades: Propiedad[] = [];
  cargando = true;
  error: string | null = null;

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
}
