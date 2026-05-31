export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime_seconds: number;
  database_connected: boolean;
}
