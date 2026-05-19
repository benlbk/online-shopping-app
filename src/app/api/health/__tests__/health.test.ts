import { GET } from '../route';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';

jest.mock('@/lib/db');
jest.mock('@/lib/health');

describe('Health Check Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      DB_TIMEOUT_MS: '2000',
      HEALTH_CHECK_CACHE_SEC: '10'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 200 when database is connected', async () => {
    (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);
    (getUptime as jest.Mock).mockReturnValue(123);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      database_connected: true,
      uptime_seconds: 123
    });
  });

  it('returns 503 when database check times out', async () => {
    (checkDatabaseConnection as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 3000))
    );
    (getUptime as jest.Mock).mockReturnValue(123);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: 'degraded',
      database_connected: false,
      uptime_seconds: 123
    });
  });

  it('uses cached result when available', async () => {
    (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);
    (getUptime as jest.Mock).mockReturnValue(123);

    // First call
    await GET();
    
    // Second call should use cache
    const response = await GET();
    const data = await response.json();

    expect(checkDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(data.database_connected).toBe(true);
  });

  it('validates environment variables', async () => {
    process.env.DATABASE_URL = '';
    
    await expect(GET()).rejects.toThrow();
  });
});