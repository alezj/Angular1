import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InquilinosService } from '../inquilinos.service';
import { PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  dashboardCards = [
    {
      title: 'Resumen general',
      description: 'Muestra indicadores clave del estado del negocio.',
      link: '/datos'
    },
    {
      title: 'Gestión de propiedades',
      description: 'Consulta el inventario y el estado de las propiedades.',
      link: '/propiedades'
    },
    {
      title: 'Pagos y alquileres',
      description: 'Revisa pagos, alquileres y mantenimientos en un solo lugar.',
      link: '/pagos'
    }
  ];

  summaryCards = [
    { label: 'Propiedades disponibles', value: '0' },
    { label: 'Propiedades ocupadas', value: '0' },
    { label: 'Inquilinos', value: '0' }
  ];

  cargando = true;
  error = '';

  constructor(
    private readonly propiedadesService: PropiedadesService,
    private readonly inquilinosService: InquilinosService
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
  }

  private cargarResumen(): void {
    this.cargando = true;
    this.error = '';

    this.propiedadesService.obtenerPropiedades().subscribe({
      next: (respuesta) => {
        const propiedades = respuesta?.data ?? [];
        const disponibles = propiedades.filter((propiedad) => propiedad.estado === 1).length;
        const ocupadas = propiedades.filter((propiedad) => propiedad.estado === 2).length;

        this.summaryCards[0].value = String(disponibles);
        this.summaryCards[1].value = String(ocupadas);

        this.inquilinosService.obtenerInquilinos().subscribe({
          next: (respuestaInquilinos) => {
            const inquilinos = respuestaInquilinos?.data ?? [];
            this.summaryCards[2].value = String(inquilinos.length);
            this.cargando = false;
          },
          error: () => {
            this.error = 'No se pudo cargar la cantidad de inquilinos.';
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen de propiedades.';
        this.cargando = false;
      }
    });
  }
}
