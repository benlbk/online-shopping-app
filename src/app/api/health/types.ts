export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}