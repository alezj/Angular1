import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
    { label: 'Total propiedades', value: '0', icon: '🏢', tone: 'blue' },
    { label: 'Disponibles', value: '0', icon: '⌂', tone: 'green' },
    { label: 'Ocupadas', value: '0', icon: '⚠', tone: 'amber' },
    { label: 'Inquilinos', value: '0', icon: '♙', tone: 'rose' }
  ];

  cargando = true;
  error = '';

  constructor(
    private readonly propiedadesService: PropiedadesService,
    private readonly inquilinosService: InquilinosService,
    private readonly cdr: ChangeDetectorRef
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

        this.summaryCards[0].value = String(propiedades.length);
        this.summaryCards[1].value = String(disponibles);
        this.summaryCards[2].value = String(ocupadas);

        this.inquilinosService.obtenerInquilinos().subscribe({
          next: (respuestaInquilinos) => {
            const inquilinos = respuestaInquilinos?.data ?? [];
            this.summaryCards[3].value = String(inquilinos.length);
            this.cargando = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.error = 'No se pudo cargar la cantidad de inquilinos.';
            this.cargando = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen de propiedades.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }
}
