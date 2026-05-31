import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthService } from '../health.service';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');
jest.mock('../health.service');

describe('Health Check Endpoint', () => {
  const originalUptime = process.uptime;
  let healthService: jest.Mocked<HealthService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.uptime = jest.fn().mockReturnValue(100);
    healthService = new HealthService() as jest.Mocked<HealthService>;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    process.uptime = originalUptime;
  });

  describe('Database Health Checks', () => {
    it('returns 200 when database is connected', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn()
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        database_connected: true,
        uptime_seconds: 100,
        timestamp: expect.any(String)
      });
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('returns 503 when database is not connected', async () => {
      const mockConnection = {
        query: jest.fn().mockRejectedValue(new Error('DB Error')),
        release: jest.fn()
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({
        status: 'unhealthy',
        database_connected: false,
        uptime_seconds: 100,
        timestamp: expect.any(String)
      });
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('handles database timeout correctly', async () => {
      const mockConnection = {
        query: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 3000))),
        release: jest.fn()
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.database_connected).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0 });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({
        status: 'error',
        message: 'Rate limit exceeded'
      });
    });
  });

  describe('Caching', () => {
    it('uses cached results within TTL period', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn()
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      await GET();
      await GET();

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
    });

    it('refreshes cache after TTL expires', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn()
      };
      (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
      (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

      await GET();
      jest.advanceTimersByTime(6000); // Move past 5s TTL
      await GET();

      expect(mockConnection.query).toHaveBeenCalledTimes(2);
    });
  });
});