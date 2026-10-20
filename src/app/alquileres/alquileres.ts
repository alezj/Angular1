import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alquiler, AlquileresService } from '../alquileres.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { Propiedad, PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-alquileres',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './alquileres.html',
  styleUrl: './alquileres.css'
})
export class Alquileres implements OnInit {
  alquileres: Alquiler[] = [];
  propiedades: Propiedad[] = [];
  inquilinos: Inquilino[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | string | null = null;
  formulario: Omit<Alquiler, 'id'> = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '' };
  searchTerm = '';
  formularioAbierto = false;
  guardando = false;

  get filteredAlquileres(): Alquiler[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.alquileres;
    return this.alquileres.filter((alquiler) =>
      `${alquiler.id} ${alquiler.propiedadID} ${this.nombrePropiedad(alquiler.propiedadID)} ${alquiler.inquilinoID} ${this.nombreInquilino(alquiler.inquilinoID)} ${alquiler.fechaInicio} ${alquiler.fechaFin} ${this.estado(alquiler)}`
        .toLowerCase()
        .includes(term)
    );
  }

  get vigentes(): number { return this.alquileres.filter((alquiler) => this.estado(alquiler) === 'Vigente').length; }
  get porIniciar(): number { return this.alquileres.filter((alquiler) => this.estado(alquiler) === 'Próximo').length; }
  get finalizados(): number { return this.alquileres.filter((alquiler) => this.estado(alquiler) === 'Finalizado').length; }

  constructor(
    private readonly alquileresService: AlquileresService,
    private readonly propiedadesService: PropiedadesService,
    private readonly inquilinosService: InquilinosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    this.error = null;
    this.alquileresService.obtenerAlquileres().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.alquileres = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los alquileres.';
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo conectar con el backend.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
    this.propiedadesService.obtenerPropiedades().subscribe({
      next: (respuesta) => {
        if (respuesta.success) this.propiedades = respuesta.data;
        this.cdr.markForCheck();
      }
    });
    this.inquilinosService.obtenerInquilinos().subscribe({
      next: (respuesta) => {
        if (respuesta.success) this.inquilinos = respuesta.data;
        this.cdr.markForCheck();
      }
    });
  }

  nombrePropiedad(id: number): string {
    const propiedad = this.propiedades.find((item) => item.id === Number(id));
    if (!propiedad) return `Propiedad #${id}`;
    const nombre = propiedad.nombre?.trim() || propiedad.codigo?.trim() || `Propiedad #${id}`;
    return propiedad.direccion?.trim() ? `${nombre} · ${propiedad.direccion.trim()}` : nombre;
  }

  nombreInquilino(id: number): string {
    const inquilino = this.inquilinos.find((item) => item.id === Number(id));
    return inquilino?.nombreApellido?.trim() || `Inquilino #${id}`;
  }

  propiedadNoDisponible(id: number): boolean {
    return !!id && !this.propiedades.some((propiedad) => propiedad.id === Number(id));
  }

  inquilinoNoDisponible(id: number): boolean {
    return !!id && !this.inquilinos.some((inquilino) => inquilino.id === Number(id));
  }
  nuevo(): void { this.cancelar(); this.formularioAbierto = true; }
  guardar(): void {
    const solicitud = this.editandoId === null
      ? this.alquileresService.crear(this.formulario)
      : this.alquileresService.actualizar(this.editandoId, this.formulario);
    this.guardando = true;
    solicitud.subscribe({
      next: () => { this.guardando = false; this.cancelar(); this.ngOnInit(); },
      error: () => { this.guardando = false; this.error = 'No se pudo guardar el contrato.'; }
    });
  }
  editar(alquiler: Alquiler): void {
    this.editandoId = alquiler.id;
    this.formulario = {
      propiedadID: alquiler.propiedadID,
      inquilinoID: alquiler.inquilinoID,
      fechaInicio: alquiler.fechaInicio.substring(0, 10),
      fechaFin: alquiler.fechaFin.substring(0, 10)
    };
    this.formularioAbierto = true;
  }
  eliminar(id: number | string): void {
    if (id && confirm('¿Eliminar este contrato?')) {
      this.alquileresService.eliminar(id).subscribe({
        next: () => this.ngOnInit(),
        error: () => this.error = 'No se pudo eliminar el contrato.'
      });
    }
  }
  cancelar(): void {
    this.formularioAbierto = false;
    this.editandoId = null;
    this.formulario = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '' };
  }
  estado(alquiler: Alquiler): 'Próximo' | 'Vigente' | 'Finalizado' {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(`${alquiler.fechaInicio.substring(0, 10)}T00:00:00`);
    const fin = new Date(`${alquiler.fechaFin.substring(0, 10)}T00:00:00`);
    if (inicio > hoy) return 'Próximo';
    if (fin < hoy) return 'Finalizado';
    return 'Vigente';
  }
}
