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
    (RateLimiter.prototype.checkLimit as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request('http://localhost/health'));
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
    (RateLimiter.prototype.checkLimit as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request('http://localhost/health'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual(expect.objectContaining({
      status: 'unhealthy',
      database_connected: false,
      uptime_seconds: expect.any(Number)
    }));
  });

  it('returns 503 when database check times out', async () => {
    const mockConnection = {
      query: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 3000)))
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.checkLimit as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request('http://localhost/health'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.database_connected).toBe(false);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    (RateLimiter.prototype.checkLimit as jest.Mock).mockReturnValue(false);

    const response = await GET(new Request('http://localhost/health'));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.status).toBe('error');
    expect(data.message).toBe('Too many requests');
  });

  it('uses cached response when available', async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockConnection);
    (RateLimiter.prototype.checkLimit as jest.Mock).mockReturnValue(true);

    // First call
    await GET(new Request('http://localhost/health'));
    
    // Second call should use cache
    const response = await GET(new Request('http://localhost/health'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getDbConnection).toHaveBeenCalledTimes(1);
    expect(data.database_connected).toBe(true);
  });
});