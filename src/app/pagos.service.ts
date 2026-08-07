import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Pago {
  id: number;
  idInquilino: number | string;
  fechaPago: string;
  monto: number | string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/pagos';

  constructor(private readonly http: HttpClient) {}

  obtenerPagos(): Observable<ApiResponse<Pago[]>> {
    return this.http.get<ApiResponse<Pago[]>>(this.apiUrl);
  }
}
