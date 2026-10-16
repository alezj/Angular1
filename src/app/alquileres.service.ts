import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Alquiler {
  id: number | string;
  propiedadID: number;
  inquilinoID: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AlquileresService {
  private readonly cacheKey = 'angular1:alquileres';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerAlquileres(): Observable<ApiResponse<Alquiler[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('alquileres')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data || []) as Alquiler[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Alquiler, 'id'>): Observable<ApiResponse<Alquiler>> {
    return from(
      this.supabaseService.client
        .from('alquileres')
        .insert(datos)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Alquiler };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number | string, datos: Omit<Alquiler, 'id'>): Observable<ApiResponse<Alquiler>> {
    return from(
      this.supabaseService.client
        .from('alquileres')
        .update(datos)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Alquiler };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number | string): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('alquileres')
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
