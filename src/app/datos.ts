
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/apps-script';

  constructor(private http: HttpClient) {}

  obtenerDatos(): Observable<string[][]> {
    return this.http.get<string[][]>(this.apiUrl);
  }

  agregarDato(valores: string[]) {
    return this.http.post(this.apiUrl, { valores });
  }
}
