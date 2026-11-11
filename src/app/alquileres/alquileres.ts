import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alquiler, AlquileresService, Garante } from '../alquileres.service';
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
  formulario: Omit<Alquiler, 'id'> = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', montoPago: null, garanteCedula: '', garanteNombreCompleto: '' };
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
    if (this.guardando) return;
    this.errorFormulario = null;
    const datos = this.formulario;
    if (!datos.propiedadID || !datos.inquilinoID || !datos.fechaInicio || !datos.fechaFin
      || datos.fechaFin < datos.fechaInicio || !Number.isFinite(datos.montoPago)
      || Number(datos.montoPago) <= 0) {
      this.errorFormulario = 'Selecciona propiedad e inquilino, un período válido y un monto mayor que cero.';
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
    estilo.textContent = 'body{font:16px/1.6 Georgia,serif;color:#182333;max-width:760px;margin:48px auto;padding:24px}h1{font-size:26px;border-bottom:2px solid;padding-bottom:16px}p{white-space:pre-wrap}.firmas{display:flex;flex-wrap:wrap;justify-content:space-between;gap:70px 24px;margin-top:90px}.firmas span{border-top:1px solid;padding-top:8px;flex:1;min-width:180px;text-align:center}button{padding:10px 20px;cursor:pointer}@media print{button{display:none}body{margin:0;max-width:none}}';
    doc.head.append(estilo);
    const titulo = doc.createElement('h1');
    titulo.textContent = `Contrato de alquiler #${alquiler.id}`;
    doc.body.append(titulo);
    const monto = this.montoAlquiler(alquiler);
    const garantes = this.garantesContrato(alquiler);
    const datos = [
      `Propiedad: ${this.nombrePropiedad(alquiler.propiedadID)}`,
      `Inquilino: ${this.nombreInquilino(alquiler.inquilinoID)}`,
      `Vigencia: ${alquiler.fechaInicio.substring(0, 10)} al ${alquiler.fechaFin.substring(0, 10)}`,
      `Monto mensual de alquiler: ${monto === null ? 'No registrado' : new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(monto)}`,
      ...(garantes.length ? garantes.map((g, i) => `Garante ${i + 1}: ${g.nombre_completo}\nCédula: ${g.cedula}`) : ['Garantes: No registrados'])
    ];
    for (const dato of datos) {
      const parrafo = doc.createElement('p');
      parrafo.textContent = dato;
      doc.body.append(parrafo);
    }
    const firmas = doc.createElement('div');
    firmas.className = 'firmas';
    for (const nombre of ['Arrendador', 'Inquilino', ...garantes.map((_, i) => `Garante ${i + 1}`)]) {
      const firma = doc.createElement('span');
      firma.textContent = nombre;
      firmas.append(firma);
    }
    doc.body.append(firmas);
    const imprimir = doc.createElement('button');
    imprimir.textContent = 'Imprimir / Guardar como PDF';
    imprimir.addEventListener('click', () => ventana.print());
    doc.body.append(imprimir);
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
    this.formulario = { propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', montoPago: null, garanteCedula: '', garanteNombreCompleto: '' };
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
