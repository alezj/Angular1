import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  constructor(private readonly http: HttpClient) {}

  obtenerPropiedades(): Observable<ApiResponse<Propiedad[]>> {
    return this.http.get<ApiResponse<Propiedad[]>>(this.apiUrl);
  }

  crear(datos: Omit<Propiedad, 'id'>) { return this.http.post(this.apiUrl, datos); }
  actualizar(id: number, datos: Omit<Propiedad, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, datos); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`); }
}
