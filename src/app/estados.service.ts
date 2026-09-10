import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

export interface Estado { id: number; nombre: string; }

interface ApiResponse<T> { success: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class EstadosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/estados';
  private readonly cacheKey = 'angular1:estados';

  constructor(private readonly http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerEstados(): Observable<ApiResponse<Estado[]>> { return this.cache.getOrFetch(this.cacheKey, this.http.get<ApiResponse<Estado[]>>(this.apiUrl)); }
  crear(datos: Omit<Estado, 'id'>) { return this.http.post(this.apiUrl, datos).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  actualizar(id: number, datos: Omit<Estado, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, datos).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
}
