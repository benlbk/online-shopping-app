export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
  error?: string;
}
