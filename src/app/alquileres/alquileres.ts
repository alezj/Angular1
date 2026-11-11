import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alquiler, AlquileresService, Garante } from '../alquileres.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { Propiedad, PropiedadesService } from '../propiedades.service';
import { Propietario, PropietariosService } from '../propietarios.service';
import { contenidoContrato, estilosContrato } from './contrato-template';

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
  propietarios: Propietario[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | string | null = null;
  formulario: Omit<Alquiler, 'id'> = { propietarioID: null, propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', montoPago: null, garanteCedula: '', garanteNombreCompleto: '' };
  garantesFormulario: Garante[] = [];
  searchTerm = '';
  formularioAbierto = false;
  guardando = false;
  renovandoId: number | string | null = null;
  accionesId: number | string | null = null;
  errorFormulario: string | null = null;

  get filteredAlquileres(): Alquiler[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.alquileres;
    return this.alquileres.filter((alquiler) =>
      `${alquiler.id} ${alquiler.propiedadID} ${this.nombrePropiedad(alquiler.propiedadID)} ${alquiler.inquilinoID} ${this.nombreInquilino(alquiler.inquilinoID)} ${this.garantesContrato(alquiler).map(g => `${g.cedula} ${g.nombre_completo}`).join(' ')} ${alquiler.fechaInicio} ${alquiler.fechaFin} ${this.estado(alquiler)}`
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
    private readonly cdr: ChangeDetectorRef,
    private readonly propietariosService: PropietariosService
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
    this.propietariosService.obtenerPropietarios().subscribe({
      next: r => { if (r.success) this.propietarios = r.data; this.cdr.markForCheck(); },
      error: () => { this.errorFormulario = 'No se pudieron cargar los propietarios. Vuelve a cargar la página.'; this.cdr.markForCheck(); }
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
    if (this.guardando) return;
    this.errorFormulario = null;
    const datos = this.formulario;
    if (!datos.propietarioID || !datos.propiedadID || !datos.inquilinoID || !datos.fechaInicio || !datos.fechaFin
      || datos.fechaFin < datos.fechaInicio || !Number.isFinite(datos.montoPago)
      || Number(datos.montoPago) <= 0) {
      this.errorFormulario = 'Selecciona propietario, propiedad e inquilino, un período válido y un monto mayor que cero.';
      return;
    }
    const garantes = this.garantesFormulario.map(g => ({
      cedula: g.cedula.trim(), nombre_completo: g.nombre_completo.trim()
    }));
    if (garantes.some(g => !g.cedula || !g.nombre_completo)) {
      this.errorFormulario = 'Completa la cédula y el nombre completo de cada garante, o quita la fila vacía.';
      return;
    }
    const cedulas = garantes.map(g => g.cedula.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
    if (new Set(cedulas).size !== cedulas.length || cedulas.some(c => !c)) {
      this.errorFormulario = 'Cada garante debe tener una cédula válida y diferente dentro del contrato.';
      return;
    }
    const payload = { ...datos, garantes,
      garanteCedula: garantes[0]?.cedula ?? null,
      garanteNombreCompleto: garantes[0]?.nombre_completo ?? null };
    this.guardando = true;
    const solicitud = this.editandoId === null
      ? this.alquileresService.crear(payload)
      : this.alquileresService.actualizar(this.editandoId, payload);
    solicitud.subscribe({
      next: (respuesta) => {
        this.guardando = false;
        if (!respuesta.success) {
          this.errorFormulario = 'No se pudo guardar el contrato.';
        } else {
          this.cancelar();
          this.ngOnInit();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.guardando = false;
        this.errorFormulario = 'No se pudo guardar el contrato. Intenta nuevamente.';
        this.cdr.markForCheck();
      }
    });
  }
  garantesContrato(alquiler: Alquiler): Garante[] {
    if (alquiler.garantes?.length) return alquiler.garantes;
    return alquiler.garanteCedula || alquiler.garanteNombreCompleto
      ? [{ cedula: alquiler.garanteCedula ?? '', nombre_completo: alquiler.garanteNombreCompleto ?? '' }]
      : [];
  }
  agregarGarante(): void {
    this.garantesFormulario.push({ cedula: '', nombre_completo: '' });
  }
  quitarGarante(indice: number): void {
    this.garantesFormulario.splice(indice, 1);
  }
  montoAlquiler(alquiler: Alquiler): number | null {
    return alquiler.montoPago
      ?? this.propiedades.find(item => item.id === Number(alquiler.propiedadID))?.precioMensual
      ?? null;
  }
  seleccionarPropiedad(): void {
    this.formulario.montoPago = this.propiedades.find(item => item.id === Number(this.formulario.propiedadID))?.precioMensual ?? null;
  }
  editar(alquiler: Alquiler): void {
    this.cancelar();
    this.editandoId = alquiler.id;
    this.garantesFormulario = this.garantesContrato(alquiler).map(({ cedula, nombre_completo }) => ({ cedula, nombre_completo }));
    this.formulario = {
      propietarioID: alquiler.propietarioID ?? null,
      propiedadID: alquiler.propiedadID,
      inquilinoID: alquiler.inquilinoID,
      fechaInicio: alquiler.fechaInicio.substring(0, 10),
      fechaFin: alquiler.fechaFin.substring(0, 10),
      montoPago: this.montoAlquiler(alquiler),
      garanteCedula: alquiler.garanteCedula ?? '',
      garanteNombreCompleto: alquiler.garanteNombreCompleto ?? ''
    };
    // Conserva condiciones existentes, sin copiar identidad, propietario o auditoría.
    for (const campo of ['importe', 'cantidadDepositos', 'diaPago', 'cantidadMeses', 'diasProrroga'] as const) {
      if (alquiler[campo] !== undefined) this.formulario[campo] = alquiler[campo];
    }
    this.formularioAbierto = true;
  }
  renovar(alquiler: Alquiler): void {
    this.editar(alquiler);
    this.editandoId = null;
    this.renovandoId = alquiler.id;
  }
  alternarAcciones(id: number | string, event: Event): void {
    event.stopPropagation();
    this.accionesId = this.accionesId === id ? null : id;
  }
  @HostListener('document:click')
  cerrarAcciones(): void { this.accionesId = null; }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.cerrarAcciones();
    this.cancelar();
  }

  generarContrato(alquiler: Alquiler): void {
    this.cerrarAcciones();
    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.error = 'Permite las ventanas emergentes para generar el contrato.';
      return;
    }
    ventana.opener = null;
    const doc = ventana.document;
    doc.documentElement.lang = 'es';
    doc.title = `Contrato de alquiler #${alquiler.id}`;
    const estilo = doc.createElement('style');
    estilo.textContent = estilosContrato;
    doc.head.append(estilo);
    const inquilino = this.inquilinos.find(item => item.id === Number(alquiler.inquilinoID));
    doc.body.innerHTML = contenidoContrato({
      numero: alquiler.id,
      propiedad: this.nombrePropiedad(alquiler.propiedadID),
      inquilino: this.nombreInquilino(alquiler.inquilinoID),
      direccionInquilino: inquilino?.direccion,
      cedulaInquilino: inquilino?.cedula,
      nacionalidadInquilino: inquilino?.nacionalidad,
      mayorEdadInquilino: inquilino?.mayorEdad,
      propietario: this.propietarios.find(p => p.id === Number(alquiler.propietarioID)),
      fechaInicio: alquiler.fechaInicio,
      fechaFin: alquiler.fechaFin,
      montoMensual: this.montoAlquiler(alquiler),
      diaPago: alquiler.diaPago ?? inquilino?.fechaPagos,
      cantidadDepositos: alquiler.cantidadDepositos,
      garantes: this.garantesContrato(alquiler)
    });
    doc.getElementById('imprimir-contrato')?.addEventListener('click', () => ventana.print());
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
    if (this.guardando) return;
    this.garantesFormulario = [];
    this.renovandoId = null;
    this.accionesId = null;
    this.errorFormulario = null;
    this.formularioAbierto = false;
    this.editandoId = null;
    this.formulario = { propietarioID: null, propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', montoPago: null, garanteCedula: '', garanteNombreCompleto: '' };
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
