let startTime: number;

// Initialize start time when module is loaded
startTime = Date.now();

/**
 * Get the service uptime in seconds
 */
export function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}
