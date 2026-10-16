import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl || 'https://placeholder.supabase.co',
      environment.supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: typeof window !== 'undefined',
          autoRefreshToken: typeof window !== 'undefined'
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
