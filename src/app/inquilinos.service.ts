import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

export interface Inquilino {
  id: number;
  nombreApellido: string;
  correo?: string;
  email?: string;
  fechaInicioContrato: string;
  fechaPagos: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class InquilinosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/inquilinos';
  private readonly cacheKey = 'angular1:inquilinos';

  constructor(private readonly http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerInquilinos(): Observable<ApiResponse<Inquilino[]>> {
    return this.cache.getOrFetch(this.cacheKey, this.http.get<ApiResponse<Inquilino[]>>(this.apiUrl));
  }
  crear(data: Omit<Inquilino, 'id'>) { return this.http.post(this.apiUrl, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  actualizar(id: number, data: Omit<Inquilino, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.cache.invalidate(this.cacheKey))); }
}
