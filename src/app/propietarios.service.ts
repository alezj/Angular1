import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { StorageCacheService } from './storage-cache.service';
import { ApiResponse } from './inquilinos.service';

export interface Propietario {
  id: number;
  nombreCompleto: string;
  cedula: string;
  nacionalidad: string;
  direccion: string;
  mayorEdad: boolean;
  telefono?: string;
  correo?: string;
}

@Injectable({ providedIn: 'root' })
export class PropietariosService {
  private readonly cacheKey = 'angular1:propietarios';
  constructor(private readonly supabase: SupabaseService, private readonly cache: StorageCacheService) {}

  obtenerPropietarios(): Observable<ApiResponse<Propietario[]>> {
    const consulta = from(this.supabase.client.from('propietario').select('*').order('nombreCompleto'))
      .pipe(map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data ?? []) as Propietario[] };
      }));
    return this.cache.getOrFetch(this.cacheKey, consulta);
  }
  crear(datos: Omit<Propietario, 'id'>): Observable<ApiResponse<Propietario>> {
    return from(this.supabase.client.from('propietario').insert(datos).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Propietario };
      }), tap(() => this.cache.invalidate(this.cacheKey)));
  }
  actualizar(id: number, datos: Omit<Propietario, 'id'>): Observable<ApiResponse<Propietario>> {
    return from(this.supabase.client.from('propietario').update(datos).eq('id', id).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Propietario };
      }), tap(() => this.cache.invalidate(this.cacheKey)));
  }
  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(this.supabase.client.from('propietario').delete().eq('id', id).select('id').single()).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, data: null };
      }), tap(() => this.cache.invalidate(this.cacheKey)));
  }
}
