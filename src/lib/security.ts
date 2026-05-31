import { URL } from 'url';

/**
 * Validates database URL for security
 * Checks for:
 * - Valid URL format
 * - Allowed protocols
 * - Required components
 */
export function validateDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    
    // Only allow postgres/postgresql protocols
    const validProtocols = ['postgres:', 'postgresql:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Require hostname
    if (!parsed.hostname) {
      return false;
    }

    // Require username and password
    if (!parsed.username || !parsed.password) {
      return false;
    }

    // Require database name
    if (parsed.pathname.length <= 1) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
