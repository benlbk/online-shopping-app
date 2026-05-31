export class UptimeTracker {
  private static instance: UptimeTracker;
  private startTime: number;

  constructor() {
    if (UptimeTracker.instance) {
      return UptimeTracker.instance;
    }
    this.startTime = Date.now();
    UptimeTracker.instance = this;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}