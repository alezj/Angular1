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
  crear(data: Omit<Pago, 'id'>) { return this.http.post(this.apiUrl, data); }
  actualizar(id: number, data: Omit<Pago, 'id'>) { return this.http.put(`${this.apiUrl}/${id}`, data); }
  eliminar(id: number) { return this.http.delete(`${this.apiUrl}/${id}`); }
}
