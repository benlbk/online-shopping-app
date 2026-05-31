import { Pool, PoolConfig } from 'pg';
import { LRUCache } from 'lru-cache';

export class DatabaseHealthMonitor {
  private pool: Pool;
  private cache: LRUCache<string, boolean>;
  private static readonly CACHE_TTL = 5000; // 5 seconds
  private static readonly QUERY_TIMEOUT = 2000; // 2 seconds

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    this.cache = new LRUCache({
      max: 1,
      ttl: DatabaseHealthMonitor.CACHE_TTL
    });
  }

  async checkHealth(): Promise<boolean> {
    const cacheKey = 'db_health';
    const cachedStatus = this.cache.get(cacheKey);
    
    if (cachedStatus !== undefined) {
      return cachedStatus;
    }

    try {
      const client = await this.pool.connect();
      try {
        await Promise.race([
          client.query('SELECT 1'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 
            DatabaseHealthMonitor.QUERY_TIMEOUT)
          )
        ]);
        
        const status = true;
        this.cache.set(cacheKey, status);
        return status;
      } finally {
        client.release();
      }
    } catch (error) {
      const status = false;
      this.cache.set(cacheKey, status);
      return status;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}