import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthStatus } from './types';

export class HealthService {
  private static instance: HealthService;
  private startTime: number;
  private rateLimiter: RateLimiter;
  private lastCheckTime: number = 0;
  private cachedStatus: HealthStatus | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds

  private constructor() {
    this.startTime = Date.now();
    this.rateLimiter = new RateLimiter(10, 60); // 10 requests per minute
  }

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public async checkHealth(): Promise<HealthStatus> {
    await this.rateLimiter.check();

    const now = Date.now();
    if (this.cachedStatus && (now - this.lastCheckTime) < this.CACHE_TTL) {
      return {
        ...this.cachedStatus,
        uptime_seconds: Math.floor((now - this.startTime) / 1000),
        timestamp: new Date().toISOString()
      };
    }

    const dbConnected = await this.checkDatabase();
    
    const status: HealthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: Math.floor((now - this.startTime) / 1000),
      timestamp: new Date().toISOString()
    };

    this.cachedStatus = status;
    this.lastCheckTime = now;

    return status;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const connection = await getDbConnection();
      const result = await Promise.race([
        connection.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 2000))
      ]);
      return !!result;
    } catch (error) {
      return false;
    }
  }
}