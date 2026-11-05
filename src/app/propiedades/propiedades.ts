import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Propiedad, PropiedadesService } from '../propiedades.service';
import type * as L from 'leaflet';

@Component({
  selector: 'app-propiedades',
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './propiedades.html',
  styleUrl: './propiedades.css'
})
export class Propiedades implements OnInit, OnDestroy {
  readonly estados = [
    { id: 1, nombre: 'Disponible' },
    { id: 2, nombre: 'Alquilada' },
    { id: 3, nombre: 'Mantenimiento' },
    { id: 4, nombre: 'Inactiva' }
  ];
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

  // Mapa interactivo Leaflet
  readonly isBrowser: boolean;
  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private LModule: typeof import('leaflet') | null = null;
  cargandoUbicacion = false;
  errorUbicacion: string | null = null;
  private mapInitTimeout: any = null;

  get propiedadesFiltradas(): Propiedad[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.propiedades;
    return this.propiedades.filter((propiedad) =>
      `${propiedad.nombre} ${propiedad.direccion} ${propiedad.notas}`.toLowerCase().includes(term)
    );
  }

  constructor(
    private readonly propiedadesService: PropiedadesService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

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

  ngOnDestroy(): void {
    this.destruirMapa();
    if (this.mapInitTimeout) {
      clearTimeout(this.mapInitTimeout);
    }
  }

  guardar(): void {
    const accion = this.editandoPropiedad === null
      ? this.propiedadesService.crear(this.formulario)
      : this.propiedadesService.actualizar(this.editandoPropiedad, this.formulario);
    accion.subscribe({
      next: () => {
        this.cancelar();
        this.ngOnInit();
      },
      error: (e) => this.error = e?.message || 'No se pudo guardar la propiedad.'
    });
  }

  private editandoPropiedad: Propiedad | null = null;

  nuevo(): void {
    this.cancelar();
    this.formularioAbierto = true;
    this.iniciarMapaConDelay();
  }

  editar(propiedad: Propiedad): void {
    this.editandoId = propiedad.id;
    this.editandoPropiedad = propiedad;
    this.formulario = { ...this.formularioVacio(), ...propiedad };
    this.imagenPreviewError = false;
    this.formularioAbierto = true;
    this.iniciarMapaConDelay();
  }

  eliminar(propiedad: Propiedad): void {
    if (confirm('¿Eliminar esta propiedad?')) {
      this.propiedadesService.eliminar(propiedad).subscribe({
        next: () => this.ngOnInit(),
        error: (e) => this.error = e?.message || 'No se pudo eliminar la propiedad.'
      });
    }
  }

  cancelar(): void {
    this.destruirMapa();
    this.editandoId = null;
    this.editandoPropiedad = null;
    this.formularioAbierto = false;
    this.formulario = this.formularioVacio();
    this.imagenPreviewError = false;
    this.errorUbicacion = null;
    this.cargandoUbicacion = false;
  }

  nombreEstado(id: number): string {
    return this.estados.find(e => e.id === id)?.nombre ?? `Sin definir (${id})`;
  }

  get esEnlaceCompartidoGoogleFotos(): boolean {
    return this.esEnlaceGoogleFotos(this.formulario.imagenUrl || '');
  }

  esEnlaceGoogleFotos(url: string): boolean {
    return /^https?:\/\/(photos\.app\.goo\.gl|photos\.google\.com\/share|photos\.google\.com\/photo)\//i.test(url);
  }

  imagenVisible(url: string): string {
    return this.esEnlaceGoogleFotos(url)
      ? `/api/google-photos-image?url=${encodeURIComponent(url)}`
      : url;
  }

  // --- MÉTODOS DE GEOLOCALIZACIÓN Y GOOGLE MAPS ---

  tieneUbicacion(propiedad: { latitud?: number | null; longitud?: number | null }): boolean {
    return (
      propiedad.latitud != null &&
      propiedad.longitud != null &&
      !isNaN(Number(propiedad.latitud)) &&
      !isNaN(Number(propiedad.longitud)) &&
      Number(propiedad.latitud) !== 0
    );
  }

  obtenerUrlGoogleMaps(lat?: number | null, lng?: number | null): string {
    if (lat == null || lng == null) return '#';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  private iniciarMapaConDelay(): void {
    if (!this.isBrowser) return;
    if (this.mapInitTimeout) clearTimeout(this.mapInitTimeout);
    this.mapInitTimeout = setTimeout(() => {
      this.inicializarMapa();
    }, 150);
  }

  private async inicializarMapa(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      if (!this.LModule) {
        this.LModule = await import('leaflet');
      }
      const L = (this.LModule as any).default || this.LModule;

      const contenedor = document.getElementById('mapa-propiedad');
      if (!contenedor) return;

      this.destruirMapa();

      const tieneCoords = this.tieneUbicacion(this.formulario);
      const defaultLat = tieneCoords ? Number(this.formulario.latitud) : 18.4861; // Santo Domingo
      const defaultLng = tieneCoords ? Number(this.formulario.longitud) : -69.9312;
      const defaultZoom = tieneCoords ? 15 : 12;

      this.mapa = L.map('mapa-propiedad', {
        zoomControl: true,
        attributionControl: true
      }).setView([defaultLat, defaultLng], defaultZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.mapa);

      const pinIcon = this.crearPinIcon(L);

      if (tieneCoords) {
        this.colocarMarcador(defaultLat, defaultLng, pinIcon, L);
      }

      this.mapa?.on('click', (e: any) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        this.formulario.latitud = lat;
        this.formulario.longitud = lng;
        this.colocarMarcador(lat, lng, pinIcon, L);
        this.errorUbicacion = null;
        this.cdr.markForCheck();
      });

      // Asegurar redimensionamiento correcto dentro del modal
      setTimeout(() => this.mapa?.invalidateSize(), 150);
      setTimeout(() => this.mapa?.invalidateSize(), 350);
    } catch (err) {
      console.error('Error al inicializar mapa Leaflet:', err);
    }
  }

  private crearPinIcon(L: any): any {
    return L.divIcon({
      className: 'property-map-pin',
      html: `
        <div style="
          background: #0786c9;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
        ">
          <svg style="transform: rotate(45deg); width: 16px; height: 16px; fill: #ffffff;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  private colocarMarcador(lat: number, lng: number, icon?: any, LInstance?: any): void {
    if (!this.mapa) return;
    const L = LInstance || (this.LModule as any)?.default || this.LModule;
    if (!L) return;

    const pinIcon = icon || this.crearPinIcon(L);

    if (this.marcador) {
      this.marcador.setLatLng([lat, lng]);
    } else {
      const nuevoMarcador = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true
      }).addTo(this.mapa);

      nuevoMarcador.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.formulario.latitud = Number(pos.lat.toFixed(6));
        this.formulario.longitud = Number(pos.lng.toFixed(6));
        this.cdr.markForCheck();
      });

      this.marcador = nuevoMarcador;
    }
  }

  onCoordenadasChange(): void {
    if (this.tieneUbicacion(this.formulario) && this.mapa) {
      const lat = Number(this.formulario.latitud);
      const lng = Number(this.formulario.longitud);
      this.colocarMarcador(lat, lng);
      this.mapa.setView([lat, lng], 15);
    }
  }

  obtenerUbicacionActual(): void {
    if (!this.isBrowser || !navigator.geolocation) {
      this.errorUbicacion = 'La geolocalización no está soportada en este navegador.';
      return;
    }

    this.cargandoUbicacion = true;
    this.errorUbicacion = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        this.formulario.latitud = lat;
        this.formulario.longitud = lng;
        this.cargandoUbicacion = false;

        if (this.mapa) {
          this.colocarMarcador(lat, lng);
          this.mapa.setView([lat, lng], 16);
          this.mapa.invalidateSize();
        }
        this.cdr.markForCheck();
      },
      (err) => {
        this.cargandoUbicacion = false;
        this.errorUbicacion = 'No se pudo obtener la ubicación: ' + (err.message || 'Permiso denegado');
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  limpiarCoordenadas(): void {
    this.formulario.latitud = null;
    this.formulario.longitud = null;
    if (this.marcador && this.mapa) {
      this.mapa.removeLayer(this.marcador);
      this.marcador = null;
    }
    this.errorUbicacion = null;
  }

  private destruirMapa(): void {
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
      this.marcador = null;
    }
  }

  private formularioVacio(): Omit<Propiedad, 'id'> {
    return {
      codigo: '',
      nombre: '',
      tipo: 'Apartamento',
      direccion: '',
      sector: '',
      ciudad: '',
      habitaciones: 0,
      banos: 0,
      parqueos: 0,
      area: 0,
      estado: 1,
      precioMensual: 0,
      deposito: 0,
      imagenUrl: '',
      notas: '',
      latitud: null,
      longitud: null
    };
  }
}
