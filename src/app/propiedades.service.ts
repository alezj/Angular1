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
}
