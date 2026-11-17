import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mantenimiento, MantenimientosService } from '../mantenimientos.service';
import { catchError, forkJoin, of } from 'rxjs';
import { EstadosService } from '../estados.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-mantenimientos',
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './mantenimientos.html',
  styleUrl: './mantenimientos.css'
})
export class Mantenimientos implements OnInit {
  estados = [
    { id: 5, nombre: 'Pendiente' },
    { id: 6, nombre: 'En proceso' },
    { id: 7, nombre: 'Finalizado' },
    { id: 8, nombre: 'Cancelado' }
  ];
  mantenimientos: Mantenimiento[] = [];
  cargando = true;
  error: string | null = null;
  mensaje = '';
  arrastrandoId: number | null = null;
  columnaDestino: number | null = null;
  readonly movimientosPendientes = new Set<number>();
  editandoId: number | null = null;
  formularioAbierto = false;
  guardando = false;
  errorFormulario: string | null = null;
  formulario = this.formularioVacio();

  constructor(
    private readonly mantenimientosService: MantenimientosService,
    private readonly cdr: ChangeDetectorRef,
    public readonly auth: AuthService,
    private readonly estadosService: EstadosService
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    this.error = null;
    forkJoin({
      solicitudes: this.mantenimientosService.obtenerMantenimientos(),
      catalogo: this.estadosService.obtenerEstados().pipe(
        catchError(() => of({ success: false, data: [] }))
      )
    }).subscribe({
      next: ({ solicitudes: respuesta, catalogo }) => {
        const estados = catalogo.data.filter(e => e.tabla?.toLowerCase() === 'mantenimientos');
        if (catalogo.success && estados.length) {
          this.estados = estados.map(e => ({ id: e.ID, nombre: e.Descripcion }));
        }
        if (respuesta.success) this.mantenimientos = respuesta.data;
        else this.error = 'No se pudieron obtener los mantenimientos.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar los mantenimientos. Intenta nuevamente.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get puedeGestionar(): boolean { return this.auth.hasPermission('mantenimientos:manage'); }

  private columnasCache: { id: number; nombre: string }[] = [];

  get columnas(): { id: number; nombre: string }[] {
    const desconocidos = [...new Set(this.mantenimientos.map(m => m.estado))]
      .filter(id => !this.estadoDisponible(id));
    const siguientes = [...this.estados,
      ...desconocidos.map(id => ({ id, nombre: this.nombreEstado(id) }))];
    if (siguientes.length !== this.columnasCache.length || siguientes.some((estado, i) =>
      estado.id !== this.columnasCache[i].id || estado.nombre !== this.columnasCache[i].nombre)) {
      this.columnasCache = siguientes;
    }
    return this.columnasCache;
  }

  solicitudesPorEstado(estado: number): Mantenimiento[] {
    return this.mantenimientos.filter(m => m.estado === estado);
  }

  // Conservar las vistas aunque cambie el catálogo o se agregue una columna antigua.
  identificarEstado(_index: number, estado: { id: number }): number {
    return estado.id;
  }

  identificarSolicitud(_index: number, mantenimiento: Mantenimiento): number {
    return mantenimiento.id;
  }

  iniciarArrastre(event: DragEvent, mantenimiento: Mantenimiento): void {
    const elemento = event.target as HTMLElement | null;
    if (!this.puedeGestionar || this.movimientosPendientes.has(mantenimiento.id)
      || this.formularioAbierto || elemento?.closest('button, select, input')) {
      event.preventDefault();
      return;
    }
    this.arrastrandoId = mantenimiento.id;
    this.error = null;
    this.mensaje = '';
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(mantenimiento.id));
    }
  }

  estadoDisponible(id: number): boolean { return this.estados.some(e => e.id === id); }

  permitirSoltar(event: DragEvent, estado: number): void {
    if (this.arrastrandoId === null || !this.puedeGestionar || !this.estadoDisponible(estado)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.columnaDestino = estado;
  }

  salirColumna(event: DragEvent, estado: number): void {
    const columna = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && columna.contains(event.relatedTarget)) return;
    if (this.columnaDestino === estado) this.columnaDestino = null;
  }

  soltar(event: DragEvent, estado: number): void {
    if (this.arrastrandoId === null) return;
    event.preventDefault();
    const id = this.arrastrandoId;
    this.finalizarArrastre();
    this.moverSolicitud(id, estado);
  }

  @HostListener('document:dragend')
  finalizarArrastre(): void {
    this.arrastrandoId = null;
    this.columnaDestino = null;
  }

  cambiarEstadoDesdeSelector(id: number, event: Event): void {
    const selector = event.target as HTMLSelectElement;
    const destino = Number(selector.value);
    const actual = this.mantenimientos.find(m => m.id === id);
    // El navegador cambia el select antes de validar permisos o iniciar el guardado.
    // Mantenerlo alineado con el modelo incluso cuando se rechaza el movimiento.
    if (actual) selector.value = String(actual.estado);
    this.moverSolicitud(id, destino);
  }

  moverSolicitud(id: number, estado: number): void {
    const solicitud = this.mantenimientos.find(m => m.id === id);
    if (!solicitud || !this.puedeGestionar || this.formularioAbierto
      || this.movimientosPendientes.has(id) || solicitud.estado === estado
      || !this.estados.some(e => e.id === estado)) return;

    const anterior = solicitud.estado;
    this.error = null;
    this.mensaje = `Guardando solicitud #${id} en ${this.nombreEstado(estado)}…`;
    this.movimientosPendientes.add(id);
    this.mantenimientos = this.mantenimientos.map(m => m.id === id ? { ...m, estado } : m);
    this.mantenimientosService.cambiarEstado(id, estado).subscribe({
      next: respuesta => {
        if (!respuesta.success) {
          this.restaurarMovimiento(id, anterior);
          return;
        }
        this.mantenimientos = this.mantenimientos.map(m => m.id === id ? respuesta.data : m);
        this.movimientosPendientes.delete(id);
        this.mensaje = `Solicitud #${id} movida a ${this.nombreEstado(respuesta.data.estado)}.`;
        this.cdr.markForCheck();
      },
      error: () => this.restaurarMovimiento(id, anterior)
    });
  }

  private restaurarMovimiento(id: number, estado: number): void {
    this.mantenimientos = this.mantenimientos.map(m => m.id === id ? { ...m, estado } : m);
    this.movimientosPendientes.delete(id);
    this.mensaje = '';
    this.error = `No se pudo mover la solicitud #${id}. Se restauró su estado anterior. Intenta nuevamente.`;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGestionar || this.guardando || this.movimientosPendientes.size > 0) return;
    const datos = { ...this.formulario, descripcion: this.formulario.descripcion.trim() };
    if (!Number.isInteger(datos.propiedadID) || datos.propiedadID < 1 || !datos.descripcion
      || !datos.fecha || !Number.isFinite(datos.costo) || datos.costo < 0
      || !this.estados.some(e => e.id === datos.estado)) {
      this.errorFormulario = 'Completa la propiedad, fecha, descripción, costo y estado válidos.';
      return;
    }
    this.guardando = true;
    this.errorFormulario = null;
    const solicitud = this.editandoId === null
      ? this.mantenimientosService.crear(datos)
      : this.mantenimientosService.actualizar(this.editandoId, datos);
    solicitud.subscribe({
      next: respuesta => {
        this.guardando = false;
        if (respuesta.success) { this.cancelar(); this.ngOnInit(); }
        else this.errorFormulario = 'No se pudo guardar la solicitud.';
        this.cdr.markForCheck();
      },
      error: () => {
        this.guardando = false;
        this.errorFormulario = 'No se pudo guardar la solicitud. Intenta nuevamente.';
        this.cdr.markForCheck();
      }
    });
  }

  nuevo(): void {
    if (!this.puedeGestionar || this.guardando || this.movimientosPendientes.size > 0) return;
    this.cancelar();
    this.formularioAbierto = true;
  }

  editar(x: Mantenimiento): void {
    if (!this.puedeGestionar || this.guardando || this.movimientosPendientes.size > 0) return;
    this.cancelar();
    this.editandoId = x.id;
    // Enviar solo los campos editables, sin copiar identidad ni auditoría.
    this.formulario = { propiedadID: x.propiedadID, descripcion: x.descripcion,
      fecha: x.fecha.substring(0, 10), costo: x.costo, estado: x.estado };
    this.formularioAbierto = true;
  }

  eliminar(id: number): void {
    if (!this.puedeGestionar || this.movimientosPendientes.size > 0 || this.guardando) return;
    if (!confirm('¿Eliminar este mantenimiento?')) return;
    this.mantenimientosService.eliminar(id).subscribe({
      next: () => this.ngOnInit(),
      error: () => { this.error = 'No se pudo eliminar la solicitud.'; this.cdr.markForCheck(); }
    });
  }

  @HostListener('document:keydown.escape')
  cancelar(): void {
    this.finalizarArrastre();
    if (this.guardando) return;
    this.editandoId = null;
    this.formularioAbierto = false;
    this.errorFormulario = null;
    this.formulario = this.formularioVacio();
  }

  private formularioVacio(): Omit<Mantenimiento, 'id'> {
    return { propiedadID: 0, descripcion: '', fecha: '', costo: 0, estado: this.estados[0].id };
  }

  nombreEstado(id: number): string {
    return this.estados.find(e => e.id === id)?.nombre ?? `Sin definir (${id})`;
  }
}
