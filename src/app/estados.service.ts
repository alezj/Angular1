import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estado { id: number; nombre: string; }

interface ApiResponse<T> { success: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class EstadosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/estados';

  constructor(private readonly http: HttpClient) {}

  obtenerEstados(): Observable<ApiResponse<Estado[]>> { return this.http.get<ApiResponse<Estado[]>>(this.apiUrl); }
  crear(datos: Omit<Estado, 'id'>) { return this.http.post(this.apiUrl, datos); }
  actualizar(id: number, datos: Omit<Estado, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, datos); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`); }
}
