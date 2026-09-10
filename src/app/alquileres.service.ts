import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

export interface Alquiler {
  id: number | string;
  propiedadID: number;
  inquilinoID: number;
  fechaInicio: string;
  fechaFin: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AlquileresService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/alquileres';
  private readonly cacheKey = 'angular1:alquileres';

  constructor(private readonly http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerAlquileres(): Observable<ApiResponse<Alquiler[]>> {
    return this.cache.getOrFetch(this.cacheKey, this.http.get<ApiResponse<Alquiler[]>>(this.apiUrl));
  }
  crear(data: Omit<Alquiler, 'id'>) { return this.http.post(this.apiUrl, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  actualizar(id: number | string, data: Omit<Alquiler, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  eliminar(id: number | string) { return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
}
