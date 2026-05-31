import { getDbConnection } from '@/lib/db';
import { Cache } from '@/lib/cache';
import { Config } from '@/config';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

export class HealthService {
  private cache: Cache<boolean>;
  private readonly dbTimeoutMs: number;
  private readonly cacheTTLMs: number;

  constructor() {
    this.dbTimeoutMs = Config.HEALTH_CHECK_TIMEOUT_MS;
    this.cacheTTLMs = Config.HEALTH_CHECK_CACHE_TTL_MS;
    this.cache = new Cache<boolean>(this.cacheTTLMs);
  }

  async getStatus(): Promise<HealthStatus> {
    const dbConnected = await this.checkDatabase();
    
    return {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }

  private async checkDatabase(): Promise<boolean> {
    const cachedStatus = this.cache.get('db_status');
    if (cachedStatus !== undefined) {
      return cachedStatus;
    }

    let connection;
    try {
      connection = await getDbConnection();
      const result = await Promise.race([
        connection.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), this.dbTimeoutMs)
        )
      ]);
      
      const isConnected = Boolean(result?.rows?.[0]?.['?column?']);
      this.cache.set('db_status', isConnected);
      return isConnected;
    } catch (error) {
      this.cache.set('db_status', false);
      return false;
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  }
}