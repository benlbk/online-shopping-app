export interface HealthStatus {
  status: 'UP' | 'DOWN';
  uptime_seconds: number;
  database_connected: boolean;
  timestamp: string;
}
