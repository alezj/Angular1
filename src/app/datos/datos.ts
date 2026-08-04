import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatosService } from '../datos';

@Component({
  selector: 'app-datos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './datos.html',
  styleUrl: './datos.css'
})
export class Datos implements OnInit {
  datos: string[][] = [];
  cargando = true;
  error: string | null = null;

   searchTerm = signal('');

  constructor(private datosService: DatosService) {}

  ngOnInit(): void {
    this.datosService.obtenerDatos().subscribe({
      next: (respuesta) => {
        this.datos = respuesta;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los datos';
        this.cargando = false;
        console.error(err);
      }
    });
  }
}
