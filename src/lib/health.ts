let startTime: number;

export function initializeHealth() {
  // Persist start time in a way that survives hot reloads
  if (typeof global.__SERVER_START_TIME === 'undefined') {
    global.__SERVER_START_TIME = Date.now();
  }
  startTime = global.__SERVER_START_TIME;
}

export function getUptime(): number {
  if (!startTime) {
    initializeHealth();
  }
  return Math.floor((Date.now() - startTime) / 1000);
}
