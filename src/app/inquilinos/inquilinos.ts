import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Inquilino, InquilinosService } from '../inquilinos.service';

@Component({
  selector: 'app-inquilinos',
  imports: [CommonModule, DatePipe],
  templateUrl: './inquilinos.html',
  styleUrl: './inquilinos.css'
})
export class Inquilinos implements OnInit {
  inquilinos: Inquilino[] = [];
  cargando = true;
  error: string | null = null;

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
}
