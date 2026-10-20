import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Alquiler, AlquileresService } from '../alquileres.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { Mantenimiento, MantenimientosService } from '../mantenimientos.service';
import { Pago, PagosService } from '../pagos.service';
import { Propiedad, PropiedadesService } from '../propiedades.service';

interface ContractEnding {
  alquiler: Alquiler;
  propiedad: Propiedad | undefined;
  inquilino: Inquilino | undefined;
  diasRestantes: number;
}

interface MonthlyIncome {
  label: string;
  cobrado: number;
  esperado: number;
  cobradoHeight: number;
  esperadoHeight: number;
}

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  propiedades: Propiedad[] = [];
  inquilinos: Inquilino[] = [];
  alquileres: Alquiler[] = [];
  pagos: Pago[] = [];
  mantenimientos: Mantenimiento[] = [];
  ingresosMensuales: MonthlyIncome[] = [];
  contratosPorVencer: ContractEnding[] = [];
  cargando = true;
  error = '';
  totalPropiedades = 0;
  propiedadesOcupadas = 0;
  ingresosMes = 0;
  ingresosEsperados = 0;
  pagosAtrasados = 0;
  montoAtrasado = 0;
  pagosPendientes = 0;
  mantenimientosActivos = 0;
  propiedadDisponible = 0;
  propiedadEnMantenimiento = 0;
  propiedadInactiva = 0;
  readonly fechaActual = new Date();

  constructor(
    private readonly propiedadesService: PropiedadesService,
    private readonly inquilinosService: InquilinosService,
    private readonly alquileresService: AlquileresService,
    private readonly pagosService: PagosService,
    private readonly mantenimientosService: MantenimientosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    let huboError = false;
    forkJoin({
      propiedades: this.propiedadesService.obtenerPropiedades().pipe(catchError(() => { huboError = true; return of({ success: false, data: [] as Propiedad[] }); })),
      inquilinos: this.inquilinosService.obtenerInquilinos().pipe(catchError(() => { huboError = true; return of({ success: false, data: [] as Inquilino[] }); })),
      alquileres: this.alquileresService.obtenerAlquileres().pipe(catchError(() => { huboError = true; return of({ success: false, data: [] as Alquiler[] }); })),
      pagos: this.pagosService.obtenerPagos().pipe(catchError(() => { huboError = true; return of({ success: false, data: [] as Pago[] }); })),
      mantenimientos: this.mantenimientosService.obtenerMantenimientos().pipe(catchError(() => { huboError = true; return of({ success: false, data: [] as Mantenimiento[] }); }))
    }).subscribe((datos) => {
      this.propiedades = datos.propiedades.data;
      this.inquilinos = datos.inquilinos.data;
      this.alquileres = datos.alquileres.data;
      this.pagos = datos.pagos.data;
      this.mantenimientos = datos.mantenimientos.data;
      this.calcularIndicadores();
      this.error = huboError ? 'Algunos datos no pudieron cargarse. Los indicadores disponibles se muestran abajo.' : '';
      this.cargando = false;
      this.cdr.markForCheck();
    });
  }

  get ocupacionPorcentaje(): number {
    return this.totalPropiedades ? Math.round(this.propiedadesOcupadas / this.totalPropiedades * 100) : 0;
  }

  get propiedadesAlquiladas(): number { return this.propiedadesOcupadas; }
  get pagosRecientes(): Pago[] {
    return this.pagos
      .filter(pago => this.estadoPago(pago) === 'Pagado')
      .sort((a, b) => this.fecha(a.fechaPago).getTime() - this.fecha(b.fechaPago).getTime())
      .reverse()
      .slice(0, 6);
  }

  get maxIngresoGrafico(): number {
    return Math.max(1, ...this.ingresosMensuales.flatMap(mes => [mes.cobrado, mes.esperado]));
  }

  formatoEje(valor: number): string {
    if (valor >= 1_000_000) return `RD$ ${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `RD$ ${(valor / 1_000).toFixed(0)}k`;
    return `RD$ ${Math.round(valor)}`;
  }

  get donutBackground(): string {
    const datos = [
      { count: this.propiedadesAlquiladas, color: '#0786c9' },
      { count: this.propiedadDisponible, color: '#13a77a' },
      { count: this.propiedadEnMantenimiento, color: '#ed8b19' },
      { count: this.propiedadInactiva, color: '#9aa8bb' }
    ].filter(segmento => segmento.count > 0);
    const total = datos.reduce((suma, segmento) => suma + segmento.count, 0);
    if (!total) return 'conic-gradient(#e7edf4 0deg 360deg)';
    let cursor = 0;
    const tramos = datos.map(segmento => {
      const inicio = cursor;
      cursor += segmento.count / total * 360;
      return `${segmento.color} ${inicio}deg ${cursor}deg`;
    });
    return `conic-gradient(${tramos.join(', ')})`;
  }

  porcentajePropiedad(cantidad: number): number {
    return this.totalPropiedades ? Math.round(cantidad / this.totalPropiedades * 100) : 0;
  }

  nombreInquilino(id: number | string): string {
    return this.inquilinos.find(inquilino => Number(inquilino.id) === Number(id))?.nombreApellido ?? 'Inquilino';
  }

  propiedadDePago(pago: Pago): string {
    const alquiler = this.alquileres.find(item => String(item.id) === String(pago.idAlquiler));
    return this.propiedades.find(item => item.id === Number(alquiler?.propiedadID))?.nombre ?? '—';
  }

  nombrePropiedad(id: number): string {
    return this.propiedades.find(propiedad => propiedad.id === Number(id))?.nombre ?? 'Propiedad';
  }

  fechaPago(pago: Pago): string {
    const fecha = this.fecha(pago.fechaPago);
    return Number.isNaN(fecha.getTime()) ? '—' : new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);
  }

  estadoPago(pago: Pago): 'Pagado' | 'Pendiente' | 'Atrasado' {
    const estado = String(pago.estado ?? '').toLowerCase();
    if (['atrasado', 'vencido', 'overdue', 'mora'].includes(estado)) return 'Atrasado';
    if (['pendiente', 'pending'].includes(estado)) return 'Pendiente';
    return 'Pagado';
  }

  private calcularIndicadores(): void {
    this.totalPropiedades = this.propiedades.length;
    this.propiedadDisponible = this.propiedades.filter(propiedad => propiedad.estado === 1).length;
    this.propiedadesOcupadas = this.propiedades.filter(propiedad => propiedad.estado === 2).length;
    this.propiedadEnMantenimiento = this.propiedades.filter(propiedad => propiedad.estado === 3).length;
    this.propiedadInactiva = this.propiedades.filter(propiedad => propiedad.estado === 4).length;

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const siguienteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const activosAhora = this.alquileres.filter(alquiler => this.activoEnMes(alquiler, inicioMes, siguienteMes));
    this.ingresosEsperados = activosAhora.reduce((total, alquiler) => total + this.rentaAlquiler(alquiler), 0);
    this.ingresosMes = this.pagos
      .filter(pago => this.estadoPago(pago) === 'Pagado' && this.estaEnMes(pago.fechaPago, ahora.getFullYear(), ahora.getMonth()))
      .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);

    const atrasados = this.pagos.filter(pago => this.estadoPago(pago) === 'Atrasado');
    this.pagosAtrasados = atrasados.length;
    this.montoAtrasado = atrasados.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
    this.pagosPendientes = this.pagos.filter(pago => this.estadoPago(pago) === 'Pendiente').length;
    this.mantenimientosActivos = this.mantenimientos.filter(mantenimiento => mantenimiento.estado === 1 || mantenimiento.estado === 2).length;
    this.calcularIngresosMensuales();
    this.calcularContratosPorVencer();
  }

  private calcularIngresosMensuales(): void {
    const meses = Array.from({ length: 6 }, (_, indice) => {
      const fecha = new Date();
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() - (5 - indice));
      return fecha;
    });
    const datos = meses.map(fecha => {
      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
      const esperado = this.alquileres
        .filter(alquiler => this.activoEnMes(alquiler, inicio, fin))
        .reduce((total, alquiler) => total + this.rentaAlquiler(alquiler), 0);
      const cobrado = this.pagos
        .filter(pago => this.estadoPago(pago) === 'Pagado' && this.estaEnMes(pago.fechaPago, fecha.getFullYear(), fecha.getMonth()))
        .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
      return { label: new Intl.DateTimeFormat('es-DO', { month: 'short' }).format(fecha), cobrado, esperado, cobradoHeight: 0, esperadoHeight: 0 };
    });
    const maximo = Math.max(1, ...datos.flatMap(item => [item.cobrado, item.esperado]));
    this.ingresosMensuales = datos.map(item => ({
      ...item,
      cobradoHeight: item.cobrado ? Math.max(3, item.cobrado / maximo * 100) : 0,
      esperadoHeight: item.esperado ? Math.max(3, item.esperado / maximo * 100) : 0
    }));
  }

  private calcularContratosPorVencer(): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 60);
    this.contratosPorVencer = this.alquileres
      .map(alquiler => {
        const fin = this.fecha(alquiler.fechaFin);
        const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
        return {
          alquiler,
          propiedad: this.propiedades.find(propiedad => propiedad.id === Number(alquiler.propiedadID)),
          inquilino: this.inquilinos.find(inquilino => inquilino.id === Number(alquiler.inquilinoID)),
          diasRestantes
        };
      })
      .filter(item => item.diasRestantes >= 0 && item.diasRestantes <= 60)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5);
  }

  private rentaAlquiler(alquiler: Alquiler): number {
    const propiedad = this.propiedades.find(item => item.id === Number(alquiler.propiedadID));
    return Number(propiedad?.precioMensual) || 0;
  }

  private activoEnMes(alquiler: Alquiler, inicioMes: Date, siguienteMes: Date): boolean {
    const inicio = this.fecha(alquiler.fechaInicio);
    const fin = this.fecha(alquiler.fechaFin);
    return inicio < siguienteMes && fin >= inicioMes;
  }

  private estaEnMes(valor: string, anio: number, mes: number): boolean {
    const fecha = this.fecha(valor);
    return !Number.isNaN(fecha.getTime()) && fecha.getFullYear() === anio && fecha.getMonth() === mes;
  }

  private fecha(valor: string): Date {
    if (!valor) return new Date(Number.NaN);
    const normalizado = valor.substring(0, 10);
    return new Date(`${normalizado}T00:00:00`);
  }
}
