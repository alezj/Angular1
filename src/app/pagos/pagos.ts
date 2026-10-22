import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Pago, PagosService } from '../pagos.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { EmailService } from '../email.service';
import { Alquiler, AlquileresService } from '../alquileres.service';
import { Propiedad, PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-pagos',
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css'
})
export class Pagos implements OnInit {
  pagos: Pago[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  editandoPago: Pago | null = null;
  formularioAbierto = false;
  formulario: Omit<Pago, 'id'> = { idInquilino: '', fechaPago: '', monto: '' };
  searchTerm = '';
  inquilinos: Inquilino[] = [];
  alquileres: Alquiler[] = [];
  propiedades: Propiedad[] = [];
  estadoFiltro = 'Todos';
  mesFiltro = new Date().getMonth() + 1;
  anioFiltro = new Date().getFullYear();
  facturaPago: Pago | null = null;
  facturaInquilino: Inquilino | null = null;
  mostrarCompartir = false;
  destinatarioFactura = '';
  enviandoFactura = false;
  errorFactura: string | null = null;
  confirmacionFactura: string | null = null;
  cobroPago: Pago | null = null;
  guardandoCobro = false;
  errorCobro: string | null = null;
  cobroFormulario = { fechaPago: this.fechaHoy(), metodoPago: 'Transferencia', banco: 'Banco Popular', referencia: '' };

  get filteredPagos(): Pago[] {
    const term = this.searchTerm.toLowerCase().trim();
    return this.pagos.filter((pago) => {
      const periodo = this.periodoPago(pago);
      const fecha = this.fechaCargo(pago);
      const fechaObj = this.parseFecha(fecha);
      const coincidePeriodo = !fechaObj || (fechaObj.getFullYear() === this.anioFiltro && (!this.mesFiltro || fechaObj.getMonth() + 1 === this.mesFiltro));
      const coincideEstado = this.estadoFiltro === 'Todos' || this.estadoPago(pago) === this.estadoFiltro;
      const texto = `${pago.id} ${pago.idInquilino} ${this.getNombreInquilino(pago.idInquilino)} ${this.nombrePropiedad(pago)} ${periodo} ${fecha} ${pago.monto} ${this.estadoPago(pago)}`.toLowerCase();
      return coincidePeriodo && coincideEstado && (!term || texto.includes(term));
    });
  }

  get pagosDelPeriodo(): Pago[] { return this.pagos.filter(p => this.enPeriodo(p)); }
  get cantidadPagados(): number { return this.pagosDelPeriodo.filter(p => this.estadoPago(p) === 'Pagado').length; }
  get cantidadPendientes(): number { return this.pagosDelPeriodo.filter(p => this.estadoPago(p) === 'Pendiente').length; }
  get cantidadAtrasados(): number { return this.pagosDelPeriodo.filter(p => this.estadoPago(p) === 'Atrasado').length; }
  get montoPagado(): number { return this.sumaEstado('Pagado'); }
  get montoPendiente(): number { return this.sumaEstado('Pendiente'); }
  get montoAtrasado(): number { return this.sumaEstado('Atrasado'); }

  constructor(
    private readonly pagosService: PagosService,
    private readonly inquilinosService: InquilinosService,
    private readonly emailService: EmailService,
    private readonly alquileresService: AlquileresService,
    private readonly propiedadesService: PropiedadesService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    this.inquilinosService.obtenerInquilinos().subscribe({
      next: (respuesta) => this.inquilinos = respuesta.data ?? []
    });
    this.alquileresService.obtenerAlquileres().subscribe({ next: r => this.alquileres = r.data ?? [] });
    this.propiedadesService.obtenerPropiedades().subscribe({ next: r => this.propiedades = r.data ?? [] });
    this.pagosService.obtenerPagos().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.pagos = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener los pagos.';
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
  }

  private sumaEstado(estado: string): number { return this.pagosDelPeriodo.filter(p => this.estadoPago(p) === estado).reduce((t, p) => t + (Number(p.monto) || 0), 0); }
  private enPeriodo(pago: Pago): boolean {
    const fecha = this.fechaCargo(pago);
    if (!fecha || !this.mesFiltro) return true;
    const d = this.parseFecha(fecha);
    if (!d) return true;
    return d.getMonth() + 1 === this.mesFiltro && d.getFullYear() === this.anioFiltro;
  }
  private parseFecha(fecha: string): Date | null {
    if (!fecha) return null;
    const normalized = /^\d{4}-\d{2}$/.test(fecha) ? `${fecha}-01` : fecha.substring(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  fechaCargo(pago: Pago): string { return pago.periodo || pago.fechaPago || ''; }
  fechaVencimiento(pago: Pago): string { return pago.fechaVencimiento || ''; }
  private numeroSeguro(valor: number | string | null | undefined): number {
    if (valor === null || valor === undefined) return 0;
    const num = Number(valor);
    return Number.isFinite(num) ? num : 0;
  }

  montoRecibido(factura: Pago): number { return this.numeroSeguro(factura.monto); }
  retrasoRecibido(factura: Pago): number { return this.numeroSeguro(factura.retraso); }
  subtotalRecibido(factura: Pago): number { return this.numeroSeguro(factura.monto) - this.numeroSeguro(factura.retraso); }

  detallePago(pago: Pago): string {
    if (!pago.fechaPago) return '—';
    const fecha = new Date(`${pago.fechaPago.substring(0, 10)}T00:00:00`);
    const texto = Number.isNaN(fecha.getTime()) ? pago.fechaPago : new Intl.DateTimeFormat('es-DO').format(fecha);
    return `${texto}${pago.metodoPago ? ` ${pago.metodoPago}` : ''}${pago.banco ? ` ${pago.banco}` : ''}${pago.referencia ? ` · Ref. ${pago.referencia}` : ''}`;
  }
  periodoPago(pago: Pago): string {
    const fecha = this.fechaCargo(pago);
    if (!fecha) return '—';
    const d = this.parseFecha(fecha);
    return !d ? fecha : new Intl.DateTimeFormat('es-DO', { month: 'short', year: 'numeric' }).format(d);
  }
  estadoPago(pago: Pago): 'Pagado' | 'Pendiente' | 'Atrasado' {
    const estado = String(pago.estado || '').toLowerCase();
    if (['pagado', 'paid', 'completado', 'completada'].includes(estado)) return 'Pagado';
    if (['atrasado', 'vencido', 'overdue', 'mora'].includes(estado)) return 'Atrasado';
    if (['pendiente', 'pending'].includes(estado)) return 'Pendiente';
    if (pago.fechaPago) return 'Pagado';
    const vencimiento = this.parseFecha(pago.fechaVencimiento || '');
    if (vencimiento) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (vencimiento < hoy) return 'Atrasado';
    }
    return 'Pendiente';
  }
  abrirCobro(pago: Pago): void {
    this.cobroPago = pago;
    this.errorCobro = null;
    this.cobroFormulario = { fechaPago: this.fechaHoy(), metodoPago: 'Transferencia', banco: 'Banco Popular', referencia: '' };
  }
  cancelarCobro(): void {
    if (this.guardandoCobro) return;
    this.cobroPago = null;
    this.errorCobro = null;
  }
  confirmarCobro(): void {
    if (!this.cobroPago || !this.cobroFormulario.fechaPago || this.guardandoCobro) return;
    this.guardandoCobro = true;
    this.errorCobro = null;
    this.pagosService.registrarCobro(this.cobroPago, {
      fechaPago: this.cobroFormulario.fechaPago,
      estado: 'Pagado',
      metodoPago: this.cobroFormulario.metodoPago,
      banco: this.cobroFormulario.metodoPago === 'Transferencia' ? this.cobroFormulario.banco : null,
      referencia: this.cobroFormulario.referencia.trim() || null
    }).pipe(
      timeout({ first: 20000 }),
      finalize(() => {
        this.guardandoCobro = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ({ data }) => {
        this.pagos = this.pagos.map(p => this.mismoPago(p, data) ? data : p);
        this.guardandoCobro = false;
        this.cancelarCobro();
        this.generarFactura(data);
        this.cdr.markForCheck();
      },
      error: (error) => {
        const detalle = String(error?.message || error?.details || '');
        this.errorCobro = /column .* does not exist|schema cache/i.test(detalle)
          ? 'Faltan campos en Supabase. Ejecuta supabase-pagos-cobro-migration.sql y vuelve a intentar.'
          : error?.name === 'TimeoutError'
            ? 'Supabase no respondió en 20 segundos. Revisa tu conexión e inténtalo otra vez.'
            : detalle || 'No se pudo registrar el cobro. Intenta nuevamente.';
        this.cdr.markForCheck();
      }
    });
  }
  private fechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }
  private mismoPago(a: Pago, b: Pago): boolean {
    return a.id === b.id && a.Origen === b.Origen && a.usuario === b.usuario;
  }
  nombrePropiedad(pago: Pago): string {
    const alquiler = this.alquileres.find(a => String(a.id) === String(pago.idAlquiler));
    return this.propiedades.find(p => p.id === Number(alquiler?.propiedadID))?.nombre ?? '—';
  }
  cambiarPeriodo(valor: string): void { this.mesFiltro = Number(valor); }
  get aniosDisponibles(): number[] {
    const years = this.pagos.map(p => this.parseFecha(this.fechaCargo(p))?.getFullYear()).filter((y): y is number => !!y);
    return [...new Set([new Date().getFullYear(), ...years])].sort((a, b) => b - a);
  }
getNombreInquilino(idInquilino: string | number | null ): string {
  if (idInquilino === null || idInquilino === undefined) {
    return 'No encontrado';
  }
  const id = Number(idInquilino);
  return this.inquilinos.find(
    i => i.id === id
  )?.nombreApellido ?? 'No encontrado';
}
  guardar(): void {
    const r = this.editandoPago === null
      ? this.pagosService.crear(this.formulario)
      : this.pagosService.actualizar(this.editandoPago, this.formulario);
    r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: (e) => this.error = e?.message || 'No se pudo guardar.' });
  }
  nuevo(): void { this.cancelar(); this.formularioAbierto = true; }
  editar(x: Pago): void { this.editandoId = x.id; this.editandoPago = x; this.formulario = { idInquilino: x.idInquilino, fechaPago: (x.fechaPago || '').substring(0, 10), monto: x.monto }; this.formularioAbierto = true; }
  eliminar(pago: Pago): void { if (confirm('¿Eliminar este pago?')) this.pagosService.eliminar(pago).subscribe({ next: () => this.ngOnInit(), error: (e) => this.error = e?.message || 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.editandoPago = null; this.formularioAbierto = false; this.formulario = { idInquilino: '', fechaPago: '', monto: '' }; }

  generarFactura(pago: Pago): void {
    this.facturaPago = pago;
    this.facturaInquilino = this.inquilinos.find((inquilino) =>
      String(inquilino.id) === String(pago.idInquilino)
    ) ?? null;
    this.mostrarCompartir = false;
    this.destinatarioFactura = '';
    this.errorFactura = null;
    this.confirmacionFactura = null;
  }

  cerrarFactura(): void {
    this.facturaPago = null;
    this.facturaInquilino = null;
    this.mostrarCompartir = false;
    this.destinatarioFactura = '';
    this.errorFactura = null;
    this.confirmacionFactura = null;
  }

  mostrarFormularioCompartir(): void {
    this.mostrarCompartir = true;
    this.errorFactura = null;
    this.confirmacionFactura = null;
  }

  enviarFactura(): void {
    if (!this.facturaPago || !this.destinatarioFactura.trim()) return;

    const nombreInquilino = this.facturaInquilino?.nombreApellido
      || `Inquilino #${this.facturaPago.idInquilino}`;

    this.enviandoFactura = true;
    this.errorFactura = null;
    this.confirmacionFactura = null;
    this.emailService.enviar({
      destinatario: this.destinatarioFactura.trim(),
      asunto: `Recibo de pago #${this.facturaPago.id}`,
      contenido: this.generarFacturaHtml(this.facturaPago, nombreInquilino),
      contenidoHtml: true
    }).subscribe({
      next: (respuesta) => {
        this.confirmacionFactura = respuesta.mensaje || 'Factura enviada correctamente.';
        this.enviandoFactura = false;
      },
      error: (respuesta) => {
        this.errorFactura = respuesta.error?.detail
          || respuesta.error?.error
          || 'No se pudo enviar la factura.';
        this.enviandoFactura = false;
      }
    });
  }

  private generarFacturaHtml(pago: Pago, nombreInquilino: string): string {
    const numero = this.escaparHtml(String(pago.id));
    const fecha = this.escaparHtml(pago.fechaPago);
    const nombre = this.escaparHtml(nombreInquilino);
    const monto = this.escaparHtml(String(pago.monto));
    const retraso = this.escaparHtml(String(Number(pago.retraso) || 0));
    const subtotal = this.escaparHtml(String(Number(pago.monto) - (Number(pago.retraso) || 0)));

    return `
      <div style="max-width:640px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0 0 8px;color:#be185d;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Recibo de pago</p>
        <div style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #be185d;padding-bottom:16px">
          <h1 style="margin:0;font-size:28px;color:#0f172a">Recibo #${numero}</h1>
          <div style="text-align:right">
            <div style="font-size:12px;color:#64748b">FECHA:</div>
            <div style="font-size:16px;font-weight:bold">${fecha}</div>
            <div style="font-size:12px;color:#64748b">NÚMERO:</div>
            <div style="font-size:16px;font-weight:bold">${numero}</div>
          </div>
        </div>
        <div style="margin:24px 0 16px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f7f9fc">
          <p style="margin:0 0 8px;color:#64748b;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase">Información del cliente</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px">
            <div>
              <div style="font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase">Nombre:</div>
              <div style="font-size:14px;font-weight:600">${nombre}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase">Teléfono:</div>
              <div style="font-size:14px;font-weight:600">—</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase">Dirección:</div>
              <div style="font-size:14px;font-weight:600">—</div>
            </div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:12px 0;text-align:left;border-bottom:1px solid #e2e8f0">Descripción</th>
              <th style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">Moneda</th>
              <th style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">Pago de propiedad${pago.metodoPago ? ` · ${this.escaparHtml(pago.metodoPago)}` : ''}${pago.banco ? ` · ${this.escaparHtml(pago.banco)}` : ''}${pago.referencia ? ` · Ref. ${this.escaparHtml(pago.referencia)}` : ''}</td>
              <td style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">usd</td>
              <td style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">${monto}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding:12px 0;text-align:right;color:#64748b;font-size:14px">Subtotal</td>
              <td style="padding:12px 0;text-align:right;color:#64748b;font-size:14px">${subtotal}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;text-align:right;color:#64748b;font-size:14px">Retraso</td>
              <td style="padding:12px 0;text-align:right;color:#64748b;font-size:14px">${retraso}</td>
            </tr>
            <tr>
              <td style="padding:16px 0 0;text-align:right;font-size:16px;font-weight:700;color:#0f172a">Total</td>
              <td style="padding:16px 0 0;text-align:right;font-size:16px;font-weight:700;color:#0f172a">${monto}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin:32px 0 0;color:#64748b">Gracias por su pago.</p>
      </div>`;
  }

  private escaparHtml(valor: string): string {
    return valor.replace(/[&<>'"]/g, (caracter) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[caracter] ?? caracter);
  }

  imprimirFactura(): void {
    if (!this.facturaPago) return;

    const tituloOriginal = document.title;
    document.title = `Recibo #${this.facturaPago.id}`;

    const restaurarTitulo = () => {
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', restaurarTitulo);
    };

    window.addEventListener('afterprint', restaurarTitulo);
    window.print();
  }
}
