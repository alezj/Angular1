import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Propiedad {
  id: number;
  nombre: string;
  direccion: string;
  estado: number;
  precioMensual: number;
  notas: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PropiedadesService {
  private readonly cacheKey = 'angular1:propiedades';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerPropiedades(): Observable<ApiResponse<Propiedad[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('propiedades')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data || []) as Propiedad[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Propiedad, 'id'>): Observable<ApiResponse<Propiedad>> {
    return from(
      this.supabaseService.client
        .from('propiedades')
        .insert(datos)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Propiedad };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number, datos: Omit<Propiedad, 'id'>): Observable<ApiResponse<Propiedad>> {
    return from(
      this.supabaseService.client
        .from('propiedades')
        .update(datos)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Propiedad };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('propiedades')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, data: null };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }
}
