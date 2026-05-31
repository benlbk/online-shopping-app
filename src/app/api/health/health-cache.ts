export class HealthCheckCache {
  private cache: any = null;
  private lastUpdate: number = 0;
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get() {
    if (!this.cache || Date.now() - this.lastUpdate > this.ttl) {
      return null;
    }
    return this.cache;
  }

  set(data: any) {
    this.cache = data;
    this.lastUpdate = Date.now();
  }

  clear() {
    this.cache = null;
    this.lastUpdate = 0;
  }
}