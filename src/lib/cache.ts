import NodeCache from 'node-cache';

class Cache {
  private static instance: Cache;
  private cache: NodeCache;

  private constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false
    });
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  async get(key: string): Promise<unknown> {
    return this.cache.get(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    this.cache.del(key);
  }

  async flush(): Promise<void> {
    this.cache.flushAll();
  }
}

export const cache = Cache.getInstance();
