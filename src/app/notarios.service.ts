import { Injectable } from '@angular/core';
import { defer, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { ApiResponse } from './inquilinos.service';

export interface Notario {
  id: number;
  nombreCompleto: string;
  cedula: string;
  matricula: string;
  jurisdiccion: string;
  direccion: string;
  telefono?: string;
  correo?: string;
}

@Injectable({ providedIn: 'root' })
export class NotariosService {
  constructor(private readonly supabase: SupabaseService) {}

  obtenerNotarios(): Observable<ApiResponse<Notario[]>> {
    const consulta = defer(() => this.supabase.client.from('notario').select('*').order('nombreCompleto'))
      .pipe(map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: (data ?? []) as Notario[] };
      }));
    return consulta;
  }
  crear(datos: Omit<Notario, 'id'>): Observable<ApiResponse<Notario>> {
    return from(this.supabase.client.from('notario').insert(datos).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Notario };
      }));
  }
  actualizar(id: number, datos: Omit<Notario, 'id'>): Observable<ApiResponse<Notario>> {
    return from(this.supabase.client.from('notario').update(datos).eq('id', id).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { success: true, data: data as Notario };
      }));
  }
  eliminar(id: number): Observable<ApiResponse<null>> {
    return from(this.supabase.client.from('notario').delete().eq('id', id).select('id').single()).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { success: true, data: null };
      }));
  }
}
