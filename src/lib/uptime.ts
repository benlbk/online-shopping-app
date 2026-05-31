export class UptimeTracker {
  private static instance: UptimeTracker;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  public static getInstance(): UptimeTracker {
    if (!UptimeTracker.instance) {
      UptimeTracker.instance = new UptimeTracker();
    }
    return UptimeTracker.instance;
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // For testing purposes
  public reset(): void {
    this.startTime = Date.now();
  }
}
