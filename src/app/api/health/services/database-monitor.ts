import { getDbConnection } from '@/lib/db';
import { Pool, PoolClient } from 'pg';

interface DbHealthStatus {
  isConnected: boolean;
  lastChecked: number;
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private pool: Pool;
  private lastStatus: DbHealthStatus | null = null;
  private readonly cacheTTL = 5000; // 5 seconds
  private readonly queryTimeout = 2000; // 2 seconds

  constructor() {
    if (DatabaseHealthMonitor.instance) {
      return DatabaseHealthMonitor.instance;
    }
    this.pool = new Pool({
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    DatabaseHealthMonitor.instance = this;
  }

  async checkHealth(): Promise<DbHealthStatus> {
    if (this.isCacheValid()) {
      return this.lastStatus!;
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await Promise.race([
        client.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), this.queryTimeout)
        )
      ]);

      this.lastStatus = {
        isConnected: true,
        lastChecked: Date.now()
      };
    } catch (error) {
      this.lastStatus = {
        isConnected: false,
        lastChecked: Date.now()
      };
    } finally {
      if (client) {
        client.release();
      }
    }

    return this.lastStatus;
  }

  private isCacheValid(): boolean {
    return this.lastStatus !== null && 
           Date.now() - this.lastStatus.lastChecked < this.cacheTTL;
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}