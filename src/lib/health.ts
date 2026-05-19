let startTime: number;

// Initialize start time when module is loaded
export function initializeHealth() {
  startTime = Date.now();
}

export function getUptime(): number {
  if (!startTime) {
    initializeHealth();
  }
  return Math.floor((Date.now() - startTime) / 1000);
}

// Initialize on module load
initializeHealth();