import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckResponse } from '../types';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');

describe('Health Check Endpoint', () => {
  const mockDate = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Database Health Checks', () => {
    it('returns 200 when database is connected', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json() as HealthCheckResponse;

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        database_connected: true,
        uptime_seconds: expect.any(Number),
        timestamp: mockDate.toISOString()
      });
    });

    it('returns 503 when database is not connected', async () => {
      const mockConnection = {
        query: jest.fn().mockRejectedValue(new Error('DB Error'))
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json() as HealthCheckResponse;

      expect(response.status).toBe(503);
      expect(data).toEqual({
        status: 'unhealthy',
        database_connected: false,
        uptime_seconds: expect.any(Number),
        timestamp: mockDate.toISOString()
      });
    });

    it('handles database timeout correctly', async () => {
      const mockConnection = {
        query: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 3000)))
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json() as HealthCheckResponse;

      expect(response.status).toBe(503);
      expect(data.database_connected).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0 });

      const response = await GET();
      const data = await response.json() as HealthCheckResponse;

      expect(response.status).toBe(429);
      expect(data.status).toBe('error');
    });
  });
});