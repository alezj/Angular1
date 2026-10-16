import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Mantenimiento {
  id: number;
  propiedadID: number;
  descripcion: string;
  fecha: string;
  costo: number;
  estado: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class MantenimientosService {
  private readonly cacheKey = 'angular1:mantenimientos';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerMantenimientos(): Observable<ApiResponse<Mantenimiento[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('mantenimientos')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data || []) as Mantenimiento[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Mantenimiento, 'id'>): Observable<ApiResponse<Mantenimiento>> {
    return from(
      this.supabaseService.client
        .from('mantenimientos')
        .insert(datos)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Mantenimiento };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number, datos: Omit<Mantenimiento, 'id'>): Observable<ApiResponse<Mantenimiento>> {
    return from(
      this.supabaseService.client
        .from('mantenimientos')
        .update(datos)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Mantenimiento };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('mantenimientos')
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
