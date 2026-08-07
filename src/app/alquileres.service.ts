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
}
