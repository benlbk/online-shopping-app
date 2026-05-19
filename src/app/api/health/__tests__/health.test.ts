import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when database is connected', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(expect.objectContaining({
      status: 'healthy',
      database_connected: true,
      uptime_seconds: expect.any(Number)
    }));
  });

  it('returns 503 when database is not connected', async () => {
    const mockConnection = {
      query: jest.fn().mockRejectedValue(new Error('DB Error'))
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual(expect.objectContaining({
      status: 'unhealthy',
      database_connected: false,
      uptime_seconds: expect.any(Number)
    }));
  });

  it('returns 429 when rate limit exceeded', async () => {
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.status).toBe('error');
  });

  it('uses cached response within TTL', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    await GET(); // First call
    await GET(); // Second call should use cache

    expect(getDbConnection).toHaveBeenCalledTimes(1);
  });

  it('handles database timeout correctly', async () => {
    const mockConnection = {
      query: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 3000)))
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.database_connected).toBe(false);
  });
});
