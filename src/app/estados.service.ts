import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Estado {
  ID: number;
  Descripcion: string;
  tabla: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class EstadosService {
  private readonly cacheKey = 'angular1:estados';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerEstados(): Observable<ApiResponse<Estado[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('estados')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const estados = (data || []).map((item: any) => ({
          ID: item.id ?? item.ID,
          Descripcion: item.Descripcion ?? item.descripcion,
          tabla: item.tabla
        }));
        return { success: true, data: estados as Estado[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Estado, 'ID'>): Observable<ApiResponse<Estado>> {
    return from(
      this.supabaseService.client
        .from('estados')
        .insert({
          Descripcion: datos.Descripcion,
          tabla: datos.tabla
        })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          success: true,
          data: { ID: data.id, Descripcion: data.Descripcion, tabla: data.tabla } as Estado
        };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number, datos: Omit<Estado, 'ID'>): Observable<ApiResponse<Estado>> {
    return from(
      this.supabaseService.client
        .from('estados')
        .update({
          Descripcion: datos.Descripcion,
          tabla: datos.tabla
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          success: true,
          data: { ID: data.id, Descripcion: data.Descripcion, tabla: data.tabla } as Estado
        };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('estados')
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
