import { GET } from '../route';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { DatabaseHealthMonitor } from '../services/database-monitor';
import { UptimeTracker } from '../services/uptime-tracker';

jest.mock('@/lib/db');
jest.mock('@/lib/rate-limiter');
jest.mock('../services/database-monitor');
jest.mock('../services/uptime-tracker');

describe('Health Check Endpoint', () => {
  let dbMonitor: DatabaseHealthMonitor;
  let uptimeTracker: UptimeTracker;
  
  beforeEach(() => {
    jest.clearAllMocks();
    dbMonitor = new DatabaseHealthMonitor();
    uptimeTracker = new UptimeTracker();
  });

  it('returns 200 when database is connected', async () => {
    const mockDbStatus = { isConnected: true, lastChecked: Date.now() };
    jest.spyOn(dbMonitor, 'checkHealth').mockResolvedValue(mockDbStatus);
    jest.spyOn(uptimeTracker, 'getUptime').mockReturnValue(100);
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
    expect(dbMonitor.checkHealth).toHaveBeenCalled();
  });

  it('returns 503 when database is not connected', async () => {
    const mockDbStatus = { isConnected: false, lastChecked: Date.now() };
    jest.spyOn(dbMonitor, 'checkHealth').mockResolvedValue(mockDbStatus);
    jest.spyOn(uptimeTracker, 'getUptime').mockReturnValue(100);
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
  });

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

  it('handles database timeout correctly', async () => {
    jest.spyOn(dbMonitor, 'checkHealth').mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ isConnected: false, lastChecked: Date.now() }), 3000))
    );
    jest.spyOn(uptimeTracker, 'getUptime').mockReturnValue(100);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.database_connected).toBe(false);
  });

  it('uses cached results within TTL period', async () => {
    const mockDbStatus = { isConnected: true, lastChecked: Date.now() };
    const checkHealthSpy = jest.spyOn(dbMonitor, 'checkHealth')
      .mockResolvedValue(mockDbStatus);
    jest.spyOn(uptimeTracker, 'getUptime').mockReturnValue(100);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    await GET();
    await GET();

    expect(checkHealthSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshes cache after TTL expires', async () => {
    const mockDbStatus = { isConnected: true, lastChecked: Date.now() - 6000 }; // Past 5s TTL
    const checkHealthSpy = jest.spyOn(dbMonitor, 'checkHealth')
      .mockResolvedValue(mockDbStatus);
    jest.spyOn(uptimeTracker, 'getUptime').mockReturnValue(100);
    (RateLimiter.prototype.check as jest.Mock).mockResolvedValue({ allowed: true, remaining: 9 });

    await GET();
    await GET();

    expect(checkHealthSpy).toHaveBeenCalledTimes(2);
  });
});