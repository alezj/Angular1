import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  constructor(private readonly http: HttpClient) {}

  obtenerAlquileres(): Observable<ApiResponse<Alquiler[]>> {
    return this.http.get<ApiResponse<Alquiler[]>>(this.apiUrl);
  }
  crear(data: Omit<Alquiler, 'id'>) { return this.http.post(this.apiUrl, data); }
  actualizar(id: number | string, data: Omit<Alquiler, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data); }
  eliminar(id: number | string) { return this.http.delete(`${this.apiUrl}/${id}`); }
}
