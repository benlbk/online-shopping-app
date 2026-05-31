import { GET } from './route';
import { getDbConnection } from '@/lib/db';

jest.mock('@/lib/db');

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when database is connected', async () => {
    const mockDb = {
      query: jest.fn().mockResolvedValue({})
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockDb);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.database_connected).toBe(true);
    expect(typeof data.uptime_seconds).toBe('number');
  });

  it('returns 503 when database is not connected', async () => {
    const mockDb = {
      query: jest.fn().mockRejectedValue(new Error('DB Error'))
    };
    (getDbConnection as jest.Mock).mockResolvedValue(mockDb);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.database_connected).toBe(false);
  });
});
