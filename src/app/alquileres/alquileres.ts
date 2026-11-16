import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alquiler, AlquileresService, Garante } from '../alquileres.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { Propiedad, PropiedadesService } from '../propiedades.service';
import { Propietario, PropietariosService } from '../propietarios.service';
import { Notario, NotariosService } from '../notarios.service';
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
  notarios: Notario[] = [];
  errorNotarios: string | null = null;
  cargando = true;
  error: string | null = null;
  editandoId: number | string | null = null;
  formulario: Omit<Alquiler, 'id'> = { notarioID: null, lugarCertificacion: '', fechaCertificacion: '', propietarioID: null, propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', cantidadMeses: null, montoPago: null, cantidadDepositos: 0, montoTotalDepositos: 0, lugarFirma: '', fechaFirma: '', garanteCedula: '', garanteNombreCompleto: '' };
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
    private readonly propietariosService: PropietariosService,
    private readonly notariosService: NotariosService
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
    this.errorNotarios = null;
    this.notariosService.obtenerNotarios().subscribe({
      next: r => { this.notarios = r.data; this.cdr.markForCheck(); },
      error: () => { this.errorNotarios = 'No se pudieron cargar los notarios. Vuelve a cargar la página.'; this.cdr.markForCheck(); }
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
    this.recalcularFechaFin();
    const datos = this.formulario;
    if (!Number.isInteger(datos.cantidadMeses) || Number(datos.cantidadMeses) < 1 || !datos.fechaFin) {
      this.errorFormulario = 'Indica una fecha de inicio válida y una cantidad entera de meses mayor que cero.';
      return;
    }
    if (!datos.propietarioID || !datos.propiedadID || !datos.inquilinoID || !datos.fechaInicio || !datos.fechaFin
      || datos.fechaFin < datos.fechaInicio || !Number.isFinite(datos.montoPago)
      || Number(datos.montoPago) <= 0) {
      this.errorFormulario = 'Selecciona propietario, propiedad e inquilino, un período válido y un monto mayor que cero.';
      return;
    }
    if (!Number.isInteger(datos.cantidadDepositos) || Number(datos.cantidadDepositos) < 0
      || !Number.isFinite(datos.montoTotalDepositos) || Number(datos.montoTotalDepositos) < 0) {
      this.errorFormulario = 'Indica una cantidad entera de depósitos y un total mayor o igual que cero.';
      return;
    }
    const fechaFirma = datos.fechaFirma ?? '';
    const fecha = new Date(`${fechaFirma}T00:00:00Z`);
    if (!datos.lugarFirma?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFirma)
      || !Number.isFinite(fecha.getTime()) || fecha.toISOString().substring(0, 10) !== fechaFirma) {
      this.errorFormulario = 'Completa la ciudad y/o provincia y una fecha de firma válida.';
      return;
    }
    if (datos.notarioID && !this.notarios.some(n => n.id === Number(datos.notarioID))) {
      this.errorFormulario = 'El notario seleccionado no está disponible. Recarga la página.'; return;
    }
    if (datos.notarioID && (!datos.lugarCertificacion?.trim() || !this.fechaValida(datos.fechaCertificacion))) {
      this.errorFormulario = 'Completa el lugar y una fecha válida de certificación notarial.'; return;
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
    const payload = { ...datos, notarioID: datos.notarioID ?? null,
      lugarCertificacion: datos.lugarCertificacion?.trim() || null,
      fechaCertificacion: datos.fechaCertificacion || null, lugarFirma: datos.lugarFirma.trim(), garantes,
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
  private fechaValida(texto: string | null | undefined): boolean {
    if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const fecha = new Date(`${texto}T00:00:00Z`);
    return Number.isFinite(fecha.getTime()) && fecha.toISOString().substring(0, 10) === texto;
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
  recalcularDepositos(): void {
    const { cantidadDepositos, montoPago } = this.formulario;
    this.formulario.montoTotalDepositos = Number.isInteger(cantidadDepositos)
      && Number(cantidadDepositos) >= 0 && Number.isFinite(montoPago) && Number(montoPago) >= 0
      ? Math.round((Number(cantidadDepositos) * Number(montoPago) + Number.EPSILON) * 100) / 100
      : null;
  }
  seleccionarPropiedad(): void {
    this.formulario.montoPago = this.propiedades.find(item => item.id === Number(this.formulario.propiedadID))?.precioMensual ?? null;
    this.recalcularDepositos();
  }
  recalcularFechaFin(): void {
    this.formulario.fechaFin = this.fechaFinPorMeses(this.formulario.fechaInicio, this.formulario.cantidadMeses);
  }
  private fechaFinPorMeses(inicio: string, meses: number | null | undefined): string {
    if (!Number.isInteger(meses) || Number(meses) < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return '';
    const [anio, mes, dia] = inicio.split('-').map(Number);
    // UTC evita desplazamientos por zona horaria; setUTCFullYear admite también años 0001–0099.
    const origen = new Date(0);
    origen.setUTCFullYear(anio, mes - 1, dia);
    if (anio < 1 || origen.getUTCFullYear() !== anio || origen.getUTCMonth() !== mes - 1 || origen.getUTCDate() !== dia) return '';
    const mesDestino = mes - 1 + Number(meses);
    const anioDestino = anio + Math.floor(mesDestino / 12);
    if (anioDestino > 9999) return '';
    const finMes = new Date(0);
    finMes.setUTCFullYear(anioDestino, mesDestino % 12 + 1, 0);
    return `${String(anioDestino).padStart(4, '0')}-${String(mesDestino % 12 + 1).padStart(2, '0')}-${String(Math.min(dia, finMes.getUTCDate())).padStart(2, '0')}`;
  }
  private mesesDelContrato(alquiler: Alquiler): number | null {
    if (Number.isInteger(alquiler.cantidadMeses) && Number(alquiler.cantidadMeses) > 0) return alquiler.cantidadMeses!;
    // Recupera la duración de contratos anteriores sin una cantidad de meses guardada.
    const inicio = alquiler.fechaInicio.substring(0, 10);
    const fin = alquiler.fechaFin.substring(0, 10);
    const [anioInicio, mesInicio] = inicio.split('-').map(Number);
    const [anioFin, mesFin] = fin.split('-').map(Number);
    const diferencia = (anioFin - anioInicio) * 12 + mesFin - mesInicio;
    for (const meses of [diferencia, diferencia + 1]) {
      const aniversario = this.fechaFinPorMeses(inicio, meses);
      if (!aniversario) continue;
      const diaAnterior = new Date(`${aniversario}T00:00:00Z`);
      diaAnterior.setUTCDate(diaAnterior.getUTCDate() - 1);
      if (fin === aniversario || fin === diaAnterior.toISOString().substring(0, 10)) return meses;
    }
    return null;
  }
  editar(alquiler: Alquiler): void {
    this.cancelar();
    this.editandoId = alquiler.id;
    this.garantesFormulario = this.garantesContrato(alquiler).map(({ cedula, nombre_completo }) => ({ cedula, nombre_completo }));
    this.formulario = {
      notarioID: alquiler.notarioID ?? null,
      lugarCertificacion: alquiler.lugarCertificacion ?? '',
      fechaCertificacion: alquiler.fechaCertificacion?.substring(0, 10) ?? '',
      propietarioID: alquiler.propietarioID ?? null,
      propiedadID: alquiler.propiedadID,
      inquilinoID: alquiler.inquilinoID,
      fechaInicio: alquiler.fechaInicio.substring(0, 10),
      fechaFin: alquiler.fechaFin.substring(0, 10),
      cantidadMeses: this.mesesDelContrato(alquiler),
      montoPago: this.montoAlquiler(alquiler),
      cantidadDepositos: alquiler.cantidadDepositos ?? 0,
      montoTotalDepositos: alquiler.montoTotalDepositos
        ?? (this.montoAlquiler(alquiler) === null ? null : Math.round((alquiler.cantidadDepositos ?? 0) * this.montoAlquiler(alquiler)! * 100) / 100),
      lugarFirma: alquiler.lugarFirma ?? '',
      fechaFirma: alquiler.fechaFirma?.substring(0, 10) ?? '',
      garanteCedula: alquiler.garanteCedula ?? '',
      garanteNombreCompleto: alquiler.garanteNombreCompleto ?? ''
    };
    // Conserva condiciones existentes, sin copiar identidad, propietario o auditoría.
    for (const campo of ['importe', 'diaPago', 'diasProrroga'] as const) {
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
    if (alquiler.notarioID && !this.notarios.some(n => n.id === Number(alquiler.notarioID))) {
      this.error = 'No se puede generar el contrato sin cargar el notario asociado. Vuelve a cargar la página.'; return;
    }
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
      notario: this.notarios.find(n => n.id === Number(alquiler.notarioID)),
      lugarCertificacion: alquiler.lugarCertificacion,
      fechaCertificacion: alquiler.fechaCertificacion,
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
      montoTotalDepositos: alquiler.montoTotalDepositos,
      lugarFirma: alquiler.lugarFirma,
      fechaFirma: alquiler.fechaFirma,
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
    this.formulario = { notarioID: null, lugarCertificacion: '', fechaCertificacion: '', propietarioID: null, propiedadID: 0, inquilinoID: 0, fechaInicio: '', fechaFin: '', cantidadMeses: null, montoPago: null, cantidadDepositos: 0, montoTotalDepositos: 0, lugarFirma: '', fechaFirma: '', garanteCedula: '', garanteNombreCompleto: '' };
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
