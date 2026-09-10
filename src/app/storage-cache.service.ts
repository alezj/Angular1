import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

@Injectable({ providedIn: 'root' })
export class StorageCacheService {
  private readonly memory = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Observable<unknown>>();
  private readonly ttl = 5 * 60 * 1000;
  private readonly browser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.browser = isPlatformBrowser(platformId);
  }

  getOrFetch<T>(key: string, request: Observable<T>): Observable<T> {
    const cached = this.read<T>(key);
    if (cached !== null) return of(cached);

    const pending = this.pending.get(key) as Observable<T> | undefined;
    if (pending) return pending;

    const requestWithCache = request.pipe(
      tap((value) => this.write(key, value)),
      finalize(() => this.pending.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.pending.set(key, requestWithCache);
    return requestWithCache;
  }

  invalidate(key: string): void {
    this.memory.delete(key);
    if (!this.browser) return;
    localStorage.removeItem(key);
  }

  private read<T>(key: string): T | null {
    const memoryEntry = this.memory.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry.value;
    this.memory.delete(key);

    if (!this.browser) return null;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const entry = JSON.parse(stored) as CacheEntry<T>;
      if (entry.expiresAt <= Date.now()) {
        localStorage.removeItem(key);
        return null;
      }
      this.memory.set(key, entry);
      return entry.value;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  private write<T>(key: string, value: T): void {
    const entry: CacheEntry<T> = { expiresAt: Date.now() + this.ttl, value };
    this.memory.set(key, entry);
    if (this.browser) localStorage.setItem(key, JSON.stringify(entry));
  }
}