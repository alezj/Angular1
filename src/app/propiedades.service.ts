import { Injectable } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

export interface Propiedad {
  id: number;
  Origen?: 'web' | 'movil' | string;
  usuario?: string;
  codigo?: string;
  nombre: string;
  tipo?: string;
  direccion: string;
  sector?: string;
  ciudad?: string;
  habitaciones?: number;
  banos?: number;
  parqueos?: number;
  area?: number;
  estado: number;
  precioMensual: number;
  deposito?: number;
  imagenUrl?: string;
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

  actualizar(propiedad: Propiedad, datos: Omit<Propiedad, 'id'>): Observable<ApiResponse<Propiedad>> {
    if (!propiedad.Origen || !propiedad.usuario) {
      return throwError(() => new Error('No se puede identificar esta propiedad: faltan Origen o usuario.'));
    }
    return from(
      this.supabaseService.client
        .from('propiedades')
        .update(datos)
        .eq('id', propiedad.id)
        .eq('Origen', propiedad.Origen)
        .eq('usuario', propiedad.usuario)
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

  eliminar(propiedad: Propiedad): Observable<ApiResponse<null>> {
    if (!propiedad.Origen || !propiedad.usuario) {
      return throwError(() => new Error('No se puede identificar esta propiedad: faltan Origen o usuario.'));
    }
    return from(
      this.supabaseService.client
        .from('propiedades')
        .delete()
        .eq('id', propiedad.id)
        .eq('Origen', propiedad.Origen)
        .eq('usuario', propiedad.usuario)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, data: null };
      }),
      tap(() => this.cache.invalidate(this.cacheKey))
    );
  }
}
