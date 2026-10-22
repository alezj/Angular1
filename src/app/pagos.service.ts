import { Injectable } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Pago {
  id: number;
  Origen?: 'web' | 'movil' | string;
  usuario?: string;
  idInquilino: number | string;
  fechaPago: string;
  monto: number | string;
  idAlquiler?: number | string | null;
  periodo?: string | null;
  estado?: string | null;
  retraso?: number | string | null;
  metodoPago?: string | null;
  banco?: string | null;
  referencia?: string | null;
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

  actualizar(pago: Pago, datos: Omit<Pago, 'id'>): Observable<ApiResponse<Pago>> {
    if (!this.tieneLlaveCompleta(pago)) return throwError(() => new Error('No se puede identificar este pago: faltan Origen o usuario.'));
    return from(
      this.supabaseService.client
        .from('pagos')
        .update(datos)
        .eq('id', pago.id)
        .eq('Origen', pago.Origen!)
        .eq('usuario', pago.usuario!)
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

  registrarCobro(pago: Pago, datos: Pick<Pago, 'fechaPago' | 'estado' | 'metodoPago' | 'banco' | 'referencia'>): Observable<ApiResponse<Pago>> {
    if (!this.tieneLlaveCompleta(pago)) return throwError(() => new Error('No se puede identificar este pago: faltan Origen o usuario.'));
    return from(
      this.supabaseService.client
        .from('pagos')
        .update(datos)
        .eq('id', pago.id)
        .eq('Origen', pago.Origen!)
        .eq('usuario', pago.usuario!)
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

  eliminar(pago: Pago): Observable<ApiResponse<null>> {
    if (!this.tieneLlaveCompleta(pago)) return throwError(() => new Error('No se puede identificar este pago: faltan Origen o usuario.'));
    return from(
      this.supabaseService.client
        .from('pagos')
        .delete()
        .eq('id', pago.id)
        .eq('Origen', pago.Origen!)
        .eq('usuario', pago.usuario!)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, data: null };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }

  private tieneLlaveCompleta(pago: Pago): boolean {
    return pago.Origen !== null && pago.Origen !== undefined && !!pago.usuario;
  }
}
