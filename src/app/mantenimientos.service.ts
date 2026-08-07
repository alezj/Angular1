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
}
