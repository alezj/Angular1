import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Alquiler, AlquileresService } from '../alquileres.service';

@Component({
  selector: 'app-alquileres',
  imports: [CommonModule, DatePipe],
  templateUrl: './alquileres.html',
  styleUrl: './alquileres.css'
})
export class Alquileres implements OnInit {
  alquileres: Alquiler[] = [];
  cargando = true;
  error: string | null = null;

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
}
