import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

export interface Propiedad {
  id: number;
  nombre: string;
  direccion: string;
  estado: number;
  precioMensual: number;
  notas: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PropiedadesService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/propiedades';
  private readonly cacheKey = 'angular1:propiedades';

  constructor(private readonly http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerPropiedades(): Observable<ApiResponse<Propiedad[]>> {
    return this.cache.getOrFetch(this.cacheKey, this.http.get<ApiResponse<Propiedad[]>>(this.apiUrl));
  }

  crear(datos: Omit<Propiedad, 'id'>) { return this.http.post(this.apiUrl, datos).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  actualizar(id: number, datos: Omit<Propiedad, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, datos).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
}
