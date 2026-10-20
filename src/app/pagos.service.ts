import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Pago {
  id: number;
  idInquilino: number | string;
  fechaPago: string;
  monto: number | string;
  idAlquiler?: number | string | null;
  periodo?: string | null;
  estado?: string | null;
  metodoPago?: string | null;
  fechaVencimiento?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly cacheKey = 'angular1:pagos';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerPagos(): Observable<ApiResponse<Pago[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('pagos')
        .select('*')
        .order('id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data || []) as Pago[] };
      })
    );
    return this.cache.getOrFetch(this.cacheKey, fetch$);
  }

  crear(datos: Omit<Pago, 'id'>): Observable<ApiResponse<Pago>> {
    return from(
      this.supabaseService.client
        .from('pagos')
        .insert(datos)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Pago };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  actualizar(id: number, datos: Omit<Pago, 'id'>): Observable<ApiResponse<Pago>> {
    return from(
      this.supabaseService.client
        .from('pagos')
        .update(datos)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Pago };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(
      this.supabaseService.client
        .from('pagos')
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
