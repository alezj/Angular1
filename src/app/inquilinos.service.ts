import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Inquilino {
  id: number;
  nombreApellido: string;
  correo?: string;
  email?: string;
  fechaInicioContrato: string;
  fechaPagos: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class InquilinosService {
  private readonly cacheKey = 'angular1:inquilinos';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerInquilinos(): Observable<ApiResponse<Inquilino[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('inquilinos')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data || []) as Inquilino[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Inquilino, 'id'>): Observable<ApiResponse<Inquilino>> {
    return from(
      this.supabaseService.client
        .from('inquilinos')
        .insert(datos)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Inquilino };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number, datos: Omit<Inquilino, 'id'>): Observable<ApiResponse<Inquilino>> {
    return from(
      this.supabaseService.client
        .from('inquilinos')
        .update(datos)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Inquilino };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('inquilinos')
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
