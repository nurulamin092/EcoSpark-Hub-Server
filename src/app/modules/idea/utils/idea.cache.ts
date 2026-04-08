/**
 * @file idea.cache.ts
 * @description Performance caching for Idea module
 * @version 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class IdeaCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits = 0;
  private misses = 0;

  public readonly TTL = {
    LIST: 30 * 1000, // 30 seconds for lists
    SINGLE: 60 * 1000, // 60 seconds for single ideas
    FEATURED: 5 * 60 * 1000, // 5 minutes for featured
    TOP_VOTED: 2 * 60 * 1000, // 2 minutes for top voted
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
    if (this.cache.size > 1000) {
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
