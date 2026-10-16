import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly cacheKey = 'angular1:datos';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerDatos(): Observable<string[][]> {
    const fetch$ = from(
      this.supabaseService.client
        .from('propiedades')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) return [];
        const headers = ['ID', 'Nombre', 'Dirección', 'Precio Mensual', 'Notas'];
        const rows = data.map((p: any) => [
          String(p.id ?? ''),
          String(p.nombre ?? ''),
          String(p.direccion ?? ''),
          String(p.precioMensual ?? ''),
          String(p.notas ?? '')
        ]);
        return [headers, ...rows];
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  agregarDato(valores: string[]) {
    const [nombre, direccion, precio, notas] = valores;
    return from(
      this.supabaseService.client.from('propiedades').insert({
        nombre: nombre || 'Nueva propiedad',
        direccion: direccion || '',
        precioMensual: Number(precio) || 0,
        notas: notas || ''
      })
    ).pipe(tap(() => this.cache.invalidate(this.cacheKey)));
  }
}
