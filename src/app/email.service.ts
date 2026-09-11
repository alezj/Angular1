import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface EnviarCorreoRequest {
  destinatario: string;
  asunto: string;
  contenido: string;
  contenidoHtml?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly apiUrl = 'http://localhost:5129/api/Email/enviar';

  constructor(private readonly http: HttpClient) {}

  enviar(request: EnviarCorreoRequest): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(this.apiUrl, request);
  }
}