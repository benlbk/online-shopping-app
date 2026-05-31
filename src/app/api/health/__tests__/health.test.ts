import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthService } from '../health.service';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');
jest.mock('../health.service');

describe('Health Check Endpoint', () => {
  let healthService: jest.Mocked<HealthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    healthService = new HealthService() as jest.Mocked<HealthService>;
    (HealthService as jest.Mock).mockImplementation(() => healthService);
  });

  it('returns 200 when all systems are healthy', async () => {
    healthService.checkHealth.mockResolvedValue({
      status: 'healthy',
      database_connected: true,
      uptime_seconds: 100,
      timestamp: new Date().toISOString()
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      database_connected: true,
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String)
    });
  });

  it('returns 503 when database is unhealthy', async () => {
    healthService.checkHealth.mockResolvedValue({
      status: 'unhealthy',
      database_connected: false,
      uptime_seconds: 100,
      timestamp: new Date().toISOString()
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: 'unhealthy',
      database_connected: false,
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String)
    });
  });

  it('returns 429 when rate limited', async () => {
    healthService.checkHealth.mockRejectedValue(new Error('Rate limit exceeded'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data).toEqual({
      status: 'error',
      message: 'Rate limit exceeded'
    });
  });

  it('returns 500 on unexpected errors', async () => {
    healthService.checkHealth.mockRejectedValue(new Error('Unexpected error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: 'error',
      message: 'Internal server error'
    });
  });
});