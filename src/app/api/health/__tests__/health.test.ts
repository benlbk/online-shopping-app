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
    (RateLimiter.prototype.allowRequest as jest.Mock).mockReturnValue(true);

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
    (RateLimiter.prototype.allowRequest as jest.Mock).mockReturnValue(true);

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
    (RateLimiter.prototype.allowRequest as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request('http://localhost/health'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.database_connected).toBe(false);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    (RateLimiter.prototype.allowRequest as jest.Mock).mockReturnValue(false);

    const response = await GET(new Request('http://localhost/health'));
    expect(response.status).toBe(429);
  });

  it('includes security headers in response', async () => {
    (getDbConnection as jest.Mock).mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
    });
    (RateLimiter.prototype.allowRequest as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request('http://localhost/health'));
    
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'");
  });
});