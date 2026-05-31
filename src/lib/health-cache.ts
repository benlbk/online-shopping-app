interface HealthResponse {
  status: string;
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

export class HealthCheckCache {
  private cache: HealthResponse | null = null;
  private lastUpdate: number = 0;
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(): HealthResponse | null {
    if (!this.cache || Date.now() - this.lastUpdate > this.ttl) {
      return null;
    }
    return this.cache;
  }

  set(response: HealthResponse): void {
    this.cache = response;
    this.lastUpdate = Date.now();
  }

  clear(): void {
    this.cache = null;
    this.lastUpdate = 0;
  }
}
