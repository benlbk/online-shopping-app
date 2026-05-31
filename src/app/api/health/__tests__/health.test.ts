import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { mockSSLConfig } from '@/lib/ssl-config';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/ssl-config');

describe('Health Check Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.DB_POOL_SIZE = '10';
    process.env.DB_IDLE_TIMEOUT = '10000';
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it('returns 200 when all systems are healthy', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: true, 
      remaining: 9,
      resetTime: Date.now() + 60000
    });
    (mockSSLConfig as jest.Mock).mockReturnValue({
      rejectUnauthorized: true,
      ca: 'mock-ca-cert'
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      database_connected: true,
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String),
      rate_limit: {
        remaining: 9,
        reset_at: expect.any(String)
      },
      ssl_enabled: true
    });
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('returns 503 when database is not connected', async () => {
    const dbError = new Error('DB Error');
    const mockConnection = {
      query: jest.fn().mockRejectedValue(dbError),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: true, 
      remaining: 9,
      resetTime: Date.now() + 60000
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: 'unhealthy',
      database_connected: false,
      error: 'Database connection failed: DB Error',
      uptime_seconds: expect.any(Number),
      timestamp: expect.any(String),
      rate_limit: {
        remaining: 9,
        reset_at: expect.any(String)
      },
      ssl_enabled: true
    });
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('returns 429 when rate limit exceeded', async () => {
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: false, 
      remaining: 0,
      resetTime: Date.now() + 60000
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data).toEqual({
      status: 'error',
      error: 'Rate limit exceeded',
      rate_limit: {
        remaining: 0,
        reset_at: expect.any(String)
      }
    });
  });

  it('uses cached response within TTL', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: true, 
      remaining: 9,
      resetTime: Date.now() + 60000
    });

    await GET(); // First call
    jest.advanceTimersByTime(4000); // Advance time but stay within cache TTL
    await GET(); // Second call should use cache

    expect(getDbConnection).toHaveBeenCalledTimes(1);
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache after TTL expiration', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: true, 
      remaining: 9,
      resetTime: Date.now() + 60000
    });

    await GET(); // First call
    jest.advanceTimersByTime(6000); // Advance time beyond cache TTL
    await GET(); // Second call should bypass cache

    expect(getDbConnection).toHaveBeenCalledTimes(2);
    expect(mockConnection.release).toHaveBeenCalledTimes(2);
  });

  it('handles database timeout correctly', async () => {
    const mockConnection = {
      query: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 3000))),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ 
      allowed: true, 
      remaining: 9,
      resetTime: Date.now() + 60000
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.database_connected).toBe(false);
    expect(data.error).toContain('Database health check timed out');
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('properly configures database pool based on environment variables', async () => {
    process.env.DB_POOL_SIZE = '5';
    process.env.DB_IDLE_TIMEOUT = '5000';
    
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn()
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);

    await GET();

    expect(getDbConnection).toHaveBeenCalledWith({
      max: 5,
      idleTimeoutMillis: 5000
    });
  });
});