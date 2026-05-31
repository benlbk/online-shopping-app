import { GET } from '../route';
import { getDbConnection } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  getDbConnection: jest.fn()
}));

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when database is connected', async () => {
    const mockPool = {
      ping: jest.fn().mockResolvedValue(undefined)
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockPool);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      status: 'UP',
      database_connected: true
    });
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeDefined();
  });

  it('returns 503 when database is not connected', async () => {
    const mockPool = {
      ping: jest.fn().mockRejectedValue(new Error('DB Error'))
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockPool);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({
      status: 'DOWN',
      database_connected: false
    });
  });
});
