import { getDbConnection } from '@/lib/db';

export class DatabaseHealthMonitor {
  private lastCheck: number = 0;
  private lastStatus: boolean = false;
  private readonly cacheTTL: number = 5000; // 5 second cache
  private checkInProgress: Promise<boolean> | null = null;

  async checkHealth(timeoutMs: number): Promise<boolean> {
    const now = Date.now();

    // Return cached result if valid
    if (now - this.lastCheck < this.cacheTTL) {
      return this.lastStatus;
    }

    // Prevent multiple simultaneous checks
    if (this.checkInProgress) {
      return this.checkInProgress;
    }

    // Perform new health check
    this.checkInProgress = this.performCheck(timeoutMs);

    try {
      const status = await this.checkInProgress;
      this.lastStatus = status;
      this.lastCheck = now;
      return status;
    } finally {
      this.checkInProgress = null;
    }
  }

  private async performCheck(timeoutMs: number): Promise<boolean> {
    try {
      const db = await getDbConnection();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database check timeout')), timeoutMs);
      });

      await Promise.race([
        db.query('SELECT 1'),
        timeoutPromise
      ]);

      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
