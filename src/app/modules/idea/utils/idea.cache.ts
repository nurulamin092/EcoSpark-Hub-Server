/**
 * @file idea.cache.ts
 * @description In-memory caching for Idea module (Redis-ready structure)
 * @version 2.0.0
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class IdeaCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  readonly TTL = {
    LIST: 30 * 1000,
    SINGLE: 60 * 1000,
    FEATURED: 5 * 60 * 1000,
    TOP_VOTED: 2 * 60 * 1000,
  };

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.size > 2000) {
      this.cleanup();
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : (this.hits / total) * 100,
    };
  }
}

export const ideaCache = new IdeaCache();
