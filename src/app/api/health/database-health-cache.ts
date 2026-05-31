import { HEALTH_CHECK_CONFIG } from './config';

interface CacheEntry {
  value: boolean;
  timestamp: number;
}

export class DatabaseHealthCache {
  private static instance: DatabaseHealthCache;
  private cache: CacheEntry | null = null;
  private readonly ttl: number;

  private constructor() {
    this.ttl = Number(HEALTH_CHECK_CONFIG.CACHE_TTL_MS);
  }

  public static getInstance(): DatabaseHealthCache {
    if (!DatabaseHealthCache.instance) {
      DatabaseHealthCache.instance = new DatabaseHealthCache();
    }
    return DatabaseHealthCache.instance;
  }

  public get(): boolean | null {
    if (!this.cache) return null;
    
    const now = Date.now();
    if (now - this.cache.timestamp > this.ttl) {
      this.cache = null;
      return null;
    }
    
    return this.cache.value;
  }

  public set(value: boolean): void {
    this.cache = {
      value,
      timestamp: Date.now()
    };
  }

  public clear(): void {
    this.cache = null;
  }
}