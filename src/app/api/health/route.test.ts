import { GET } from './route';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';

jest.mock('@/lib/db');
jest.mock('@/lib/health');

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when all systems are healthy', async () => {
    (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);
    (getUptime as jest.Mock).mockReturnValue(123);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      uptime_seconds: 123,
      database_connected: true
    });
  });

  it('returns 503 when database is not connected', async () => {
    (checkDatabaseConnection as jest.Mock).mockResolvedValue(false);
    (getUptime as jest.Mock).mockReturnValue(123);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: 'degraded',
      uptime_seconds: 123,
      database_connected: false
    });
  });

  it('returns 503 when database check throws error', async () => {
    (checkDatabaseConnection as jest.Mock).mockRejectedValue(new Error('DB Error'));
    (getUptime as jest.Mock).mockReturnValue(123);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: 'error',
      uptime_seconds: 123,
      database_connected: false
    });
  });
});
