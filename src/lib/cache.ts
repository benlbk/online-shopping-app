import NodeCache from 'node-cache';

class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttl: number): Promise<boolean> {
    return this.cache.set(key, value, ttl);
  }

  async del(key: string): Promise<number> {
    return this.cache.del(key);
  }
}

export const cacheManager = new CacheManager();
