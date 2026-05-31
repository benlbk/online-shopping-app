import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { UptimeTracker } from '../uptime-tracker';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');
jest.mock('../uptime-tracker');

describe('Health Check Endpoint', () => {
  let uptimeTracker: UptimeTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    uptimeTracker = UptimeTracker.getInstance();
  });

  afterEach(() => {
    UptimeTracker.resetInstance(); // Clean up singleton
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
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String)
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
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String)
    }));
  });

  it('returns 429 when rate limit exceeded', async () => {
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.status).toBe('error');
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

  it('caches database status for performance', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);

    await GET();
    await GET();

    expect(mockConnection.query).toHaveBeenCalledTimes(1); // Should use cached result
  });
});