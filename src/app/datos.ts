
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatosService {
  private apiUrl = 'http://localhost:3000/api/datos';

  constructor(private http: HttpClient) {}

  obtenerDatos(): Observable<string[][]> {
    return this.http.get<string[][]>(this.apiUrl);
  }

  agregarDato(valores: string[]) {
    return this.http.post(this.apiUrl, { valores });
  }
}
