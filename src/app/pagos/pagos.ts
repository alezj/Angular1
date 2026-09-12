import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pago, PagosService } from '../pagos.service';
import { Inquilino, InquilinosService } from '../inquilinos.service';
import { EmailService } from '../email.service';

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
  formulario: Omit<Pago, 'id'> = { idInquilino: '', fechaPago: '', monto: '' };
  searchTerm = '';
  inquilinos: Inquilino[] = [];
  facturaPago: Pago | null = null;
  facturaInquilino: Inquilino | null = null;
  mostrarCompartir = false;
  destinatarioFactura = '';
  enviandoFactura = false;
  errorFactura: string | null = null;
  confirmacionFactura: string | null = null;

  get filteredPagos(): Pago[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.pagos;
    return this.pagos.filter((pago) =>
      `${pago.idInquilino} ${pago.fechaPago} ${pago.monto}`.toLowerCase().includes(term)
    );
  }

  constructor(
    private readonly pagosService: PagosService,
    private readonly inquilinosService: InquilinosService,
    private readonly emailService: EmailService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inquilinosService.obtenerInquilinos().subscribe({
      next: (respuesta) => this.inquilinos = respuesta.data ?? []
    });
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
  guardar(): void { const r = this.editandoId === null ? this.pagosService.crear(this.formulario) : this.pagosService.actualizar(this.editandoId, this.formulario); r.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: () => this.error = 'No se pudo guardar.' }); }
  editar(x: Pago): void { this.editandoId = x.id; this.formulario = { idInquilino: x.idInquilino, fechaPago: x.fechaPago.substring(0, 10), monto: x.monto }; }
  eliminar(id: number): void { if (confirm('¿Eliminar este pago?')) this.pagosService.eliminar(id).subscribe({ next: () => this.ngOnInit(), error: () => this.error = 'No se pudo eliminar.' }); }
  cancelar(): void { this.editandoId = null; this.formulario = { idInquilino: '', fechaPago: '', monto: '' }; }

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
