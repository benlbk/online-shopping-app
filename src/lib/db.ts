import { cache } from 'react';

interface DatabaseStatus {
  isConnected: boolean;
  lastChecked: number;
}

let cachedStatus: DatabaseStatus = {
  isConnected: false,
  lastChecked: 0
};

const CACHE_TTL = 10000; // 10 seconds
const DB_TIMEOUT = 2000; // 2 seconds

/**
 * Check database connection with caching
 */
export const checkDatabaseConnection = cache(async (): Promise<boolean> => {
  const now = Date.now();
  
  // Return cached result if still valid
  if (now - cachedStatus.lastChecked < CACHE_TTL) {
    return cachedStatus.isConnected;
  }

  try {
    // Simulate database connection check
    // Replace with actual database connection check
    const checkPromise = new Promise<boolean>((resolve) => {
      // Simulate DB check that usually succeeds
      setTimeout(() => resolve(true), 100);
    });

    // Add timeout
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Database check timeout')), DB_TIMEOUT);
    });

    const isConnected = await Promise.race([checkPromise, timeoutPromise]);

    cachedStatus = {
      isConnected,
      lastChecked: now
    };

    return isConnected;

  } catch (error) {
    console.error('Database connection check failed:', error);
    cachedStatus = {
      isConnected: false,
      lastChecked: now
    };
    return false;
  }
});
