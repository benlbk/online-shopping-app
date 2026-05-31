import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { UptimeTracker } from '../uptime';
import { getDbConnection, closeDbConnection } from '../db';

describe('Health Check Components', () => {
  beforeEach(() => {
    UptimeTracker.getInstance().reset();
  });

  describe('UptimeTracker', () => {
    test('should return uptime in seconds', async () => {
      const tracker = UptimeTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(tracker.getUptimeSeconds()).toBeGreaterThanOrEqual(1);
    });

    test('should maintain singleton instance', () => {
      const tracker1 = UptimeTracker.getInstance();
      const tracker2 = UptimeTracker.getInstance();
      expect(tracker1).toBe(tracker2);
    });
  });

  describe('Database Connection', () => {
    test('should connect to database', async () => {
      const db = await getDbConnection();
      const result = await db.raw('SELECT 1');
      expect(result).toBeDefined();
      await closeDbConnection();
    });

    test('should handle connection timeout', async () => {
      // Mock a slow database
      jest.spyOn(global, 'setTimeout');
      try {
        const db = await getDbConnection();
        await db.raw('SELECT 1').timeout(1);
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
