import { Component, OnInit, computed, signal } from '@angular/core';
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
  filteredRows = computed(() => {
    const query = this.searchTerm().toLowerCase().trim();
    if (!query) return this.datos.slice(1);
    return this.datos.slice(1).filter((fila) => fila.some((celda) => celda.toString().toLowerCase().includes(query)));
  });

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
