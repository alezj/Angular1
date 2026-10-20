import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Propiedad, PropiedadesService } from '../propiedades.service';

@Component({
  selector: 'app-propiedades',
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './propiedades.html',
  styleUrl: './propiedades.css'
})
export class Propiedades implements OnInit {
  readonly estados = [{ id: 1, nombre: 'Disponible' }, { id: 2, nombre: 'Alquilada' }, { id: 3, nombre: 'Mantenimiento' }, { id: 4, nombre: 'Inactiva' }];
  propiedades: Propiedad[] = [];
  cargando = true;
  error: string | null = null;
  editandoId: number | null = null;
  formularioAbierto = false;
  vista: 'tarjetas' | 'tabla' = 'tarjetas';
  searchTerm = '';
  formulario: Omit<Propiedad, 'id'> = this.formularioVacio();
  imagenPreviewError = false;
  readonly tipos = ['Casa', 'Apartamento', 'Penthouse', 'Villa', 'Local comercial', 'Oficina', 'Terreno', 'Otro'];

  get propiedadesFiltradas(): Propiedad[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.propiedades;
    return this.propiedades.filter((propiedad) =>
      `${propiedad.nombre} ${propiedad.direccion} ${propiedad.notas}`.toLowerCase().includes(term)
    );
  }

  constructor(private readonly propiedadesService: PropiedadesService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.propiedadesService.obtenerPropiedades().subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.propiedades = respuesta.data;
        } else {
          this.error = 'La API no pudo obtener las propiedades.';
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

  guardar(): void {
    const accion = this.editandoPropiedad === null
      ? this.propiedadesService.crear(this.formulario)
      : this.propiedadesService.actualizar(this.editandoPropiedad, this.formulario);
    accion.subscribe({ next: () => { this.cancelar(); this.ngOnInit(); }, error: (e) => this.error = e?.message || 'No se pudo guardar la propiedad.' });
  }
  private editandoPropiedad: Propiedad | null = null;
  nuevo(): void { this.cancelar(); this.formularioAbierto = true; }
  editar(propiedad: Propiedad): void {
    this.editandoId = propiedad.id;
    this.editandoPropiedad = propiedad;
    this.formulario = { ...this.formularioVacio(), ...propiedad };
    this.imagenPreviewError = false;
    this.formularioAbierto = true;
  }
  eliminar(propiedad: Propiedad): void { if (confirm('¿Eliminar esta propiedad?')) this.propiedadesService.eliminar(propiedad).subscribe({ next: () => this.ngOnInit(), error: (e) => this.error = e?.message || 'No se pudo eliminar la propiedad.' }); }
  cancelar(): void { this.editandoId = null; this.editandoPropiedad = null; this.formularioAbierto = false; this.formulario = this.formularioVacio(); this.imagenPreviewError = false; }
  nombreEstado(id: number): string { return this.estados.find(e => e.id === id)?.nombre ?? `Sin definir (${id})`; }
  get esEnlaceCompartidoGoogleFotos(): boolean {
    return this.esEnlaceGoogleFotos(this.formulario.imagenUrl || '');
  }
  esEnlaceGoogleFotos(url: string): boolean { return /^https?:\/\/(photos\.app\.goo\.gl|photos\.google\.com\/share|photos\.google\.com\/photo)\//i.test(url); }
  imagenVisible(url: string): string {
    return this.esEnlaceGoogleFotos(url)
      ? `/api/google-photos-image?url=${encodeURIComponent(url)}`
      : url;
  }

  private formularioVacio(): Omit<Propiedad, 'id'> {
    return { codigo: '', nombre: '', tipo: 'Apartamento', direccion: '', sector: '', ciudad: '', habitaciones: 0, banos: 0, parqueos: 0, area: 0, estado: 1, precioMensual: 0, deposito: 0, imagenUrl: '', notas: '' };
  }
}
