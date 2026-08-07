import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Inquilino {
  id: number;
  nombreApellido: string;
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

  constructor(private readonly http: HttpClient) {}

  obtenerInquilinos(): Observable<ApiResponse<Inquilino[]>> {
    return this.http.get<ApiResponse<Inquilino[]>>(this.apiUrl);
  }
}
