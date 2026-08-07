import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadosService, Estado } from '../estados.service';

@Component({
  selector: 'app-estados',
  imports: [CommonModule, FormsModule],
  templateUrl: './estados.html',
  styleUrl: './estados.css'
})
export class Estados implements OnInit {
  estados: Estado[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formulario: Omit<Estado, 'id'> = { nombre: '' };

  constructor(private readonly estadosService: EstadosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.estadosService.obtenerEstados().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.estados = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los estados.';
        }
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
      }
    });
  }

  guardar(): void {
    const accion = this.editandoId === null
      ? this.estadosService.crear(this.formulario)
      : this.estadosService.actualizar(this.editandoId, this.formulario);

    accion.subscribe({ next: () => { this.cancelar(); this.cargar(); }, error: () => this.error = 'No se pudo guardar el estado.' });
  }

  editar(estado: Estado): void { this.editandoId = estado.id; this.formulario = { nombre: estado.nombre }; }
  eliminar(id: number): void { if (confirm('¿Eliminar este estado?')) this.estadosService.eliminar(id).subscribe({ next: () => this.cargar(), error: () => this.error = 'No se pudo eliminar el estado.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { nombre: '' }; }
}
