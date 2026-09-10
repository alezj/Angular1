import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

export interface Mantenimiento {
  id: number;
  propiedadID: number;
  descripcion: string;
  fecha: string;
  costo: number;
  estado: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class MantenimientosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/mantenimientos';
  private readonly cacheKey = 'angular1:mantenimientos';

  constructor(private readonly http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerMantenimientos(): Observable<ApiResponse<Mantenimiento[]>> {
    return this.cache.getOrFetch(this.cacheKey, this.http.get<ApiResponse<Mantenimiento[]>>(this.apiUrl));
  }
  crear(data: Omit<Mantenimiento, 'id'>) { return this.http.post(this.apiUrl, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  actualizar(id: number, data: Omit<Mantenimiento, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
}
