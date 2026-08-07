import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  constructor(private readonly http: HttpClient) {}

  obtenerMantenimientos(): Observable<ApiResponse<Mantenimiento[]>> {
    return this.http.get<ApiResponse<Mantenimiento[]>>(this.apiUrl);
  }
  crear(data: Omit<Mantenimiento, 'id'>) { return this.http.post(this.apiUrl, data); }
  actualizar(id: number, data: Omit<Mantenimiento, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`); }
}
