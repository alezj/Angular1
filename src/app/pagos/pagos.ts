import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  detallePago(pago: Pago): string {
    if (!pago.fechaPago) return '—';
    const fecha = new Date(`${pago.fechaPago.substring(0, 10)}T00:00:00`);
    const texto = Number.isNaN(fecha.getTime()) ? pago.fechaPago : new Intl.DateTimeFormat('es-DO').format(fecha);
    return `${texto}${pago.metodoPago ? ` · ${pago.metodoPago}` : ''}`;
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
  guardar(): void { const r = this.editandoId === null ? this.pagosService.crear(this.formulario) : this.pagosService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  nuevo(): void { this.cancelar(); this.formularioAbierto = true; }
  editar(x: Pago): void { this.editandoId = x.id; this.formulario = { idInquilino: x.idInquilino, fechaPago: x.fechaPago.substring(0, 10), monto: x.monto }; this.formularioAbierto = true; }
  eliminar(id: number): void { if (confirm('¿Eliminar este pago?')) this.pagosService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formularioAbierto = false; this.formulario = { idInquilino: '', fechaPago: '', monto: '' }; }

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
      asunto: `Factura #${this.facturaPago.id}`,
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

    return `
      <div style="max-width:640px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0 0 8px;color:#be185d;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Comprobante de pago</p>
        <div style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #be185d;padding-bottom:16px">
          <h1 style="margin:0;font-size:28px;color:#0f172a">Factura #${numero}</h1>
          <strong style="font-size:16px">${fecha}</strong>
        </div>
        <p style="margin:24px 0 4px;color:#64748b">Recibido de</p>
        <p style="margin:0 0 24px;font-size:18px;font-weight:bold">${nombre}</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:12px 0;text-align:left;border-bottom:1px solid #e2e8f0">Descripción</th>
              <th style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e2e8f0">Pago de alquiler</td>
              <td style="padding:12px 0;text-align:right;border-bottom:1px solid #e2e8f0">${monto}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th style="padding:16px 0 0;text-align:left;font-size:16px">Total pagado</th>
              <th style="padding:16px 0 0;text-align:right;font-size:16px">${monto}</th>
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
    document.title = `Factura #${this.facturaPago.id}`;

    const restaurarTitulo = () => {
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', restaurarTitulo);
    };

    window.addEventListener('afterprint', restaurarTitulo);
    window.print();
  }
}
