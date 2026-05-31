let startTime = Date.now();

// Reset start time when service restarts
process.on('SIGTERM', () => {
  startTime = Date.now();
});

process.on('SIGINT', () => {
  startTime = Date.now();
});

export function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

// Persist uptime across restarts
export function persistUptime() {
  const fs = require('fs');
  try {
    fs.writeFileSync('.uptime', startTime.toString());
  } catch (error) {
    console.error('Failed to persist uptime:', error.message);
  }
}

// Restore uptime on startup
export function restoreUptime() {
  const fs = require('fs');
  try {
    const saved = fs.readFileSync('.uptime');
    startTime = parseInt(saved.toString(), 10);
  } catch (error) {
    // Use current time if restore fails
    startTime = Date.now();
  }
}
