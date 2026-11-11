import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Garante {
  id?: number | string;
  alquiler_id?: number | string;
  cedula: string;
  nombre_completo: string;
}

export interface Alquiler {
  id: number | string;
  propiedadID: number;
  inquilinoID: number;
  fechaInicio: string;
  fechaFin: string;
  garantes?: Garante[];
  garanteCedula?: string | null;
  garanteNombreCompleto?: string | null;
  montoPago?: number | null;
  importe?: number | null;
  cantidadDepositos?: number | null;
  diaPago?: number | null;
  cantidadMeses?: number | null;
  diasProrroga?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AlquileresService {
  private readonly cacheKey = 'angular1:alquileres:v2-garantes';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cache: StorageCacheService
  ) {}

  obtenerAlquileres(): Observable<ApiResponse<Alquiler[]>> {
    const fetch$ = from(
      this.supabaseService.client
        .from('alquileres')
        .select('*, garantes(*)')
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
    return this.guardar(datos, null);
  }

  actualizar(id: number | string, datos: Omit<Alquiler, 'id'>): Observable<ApiResponse<Alquiler>> {
    return this.guardar(datos, id);
  }

  private guardar(datos: Omit<Alquiler, 'id'>, id: number | string | null): Observable<ApiResponse<Alquiler>> {
    const { garantes, ...contrato } = datos;
    const lista = garantes ?? (datos.garanteCedula && datos.garanteNombreCompleto
      ? [{ cedula: datos.garanteCedula, nombre_completo: datos.garanteNombreCompleto }]
      : []);
    return from(this.supabaseService.client.rpc('guardar_contrato_con_garantes', {
      p_id: id,
      p_datos: contrato,
      p_garantes: lista.map(({ cedula, nombre_completo }) => ({ cedula, nombre_completo }))
    })).pipe(
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
