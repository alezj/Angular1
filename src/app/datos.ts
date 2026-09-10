
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';

@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly apiUrl = 'http://localhost:5129/api/backend/apps-script';
  private readonly cacheKey = 'angular1:datos';

  constructor(private http: HttpClient, private readonly cache: StorageCacheService) {}

  obtenerDatos(): Observable<string[][]> {
    return this.cache.getOrFetch(this.cacheKey, this.http.get<string[][]>(this.apiUrl));
  }

  agregarDato(valores: string[]) {
    return this.http.post(this.apiUrl, { valores }).pipe(tap(() => this.cache.invalidate(this.cacheKey)));
  }
}
