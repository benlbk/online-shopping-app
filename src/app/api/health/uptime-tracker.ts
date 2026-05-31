export class UptimeTracker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  reset(): void {
    this.startTime = Date.now();
  }
}