import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
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
}
