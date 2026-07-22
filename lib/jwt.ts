/**
 * Decode a JWT payload without verifying the signature.
 * Used only for UI hints (sidebar filtering, role-based redirects).
 * Backend is the real authority for access control.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url → Base64 → decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type UserRole = 'OWNER' | 'STAFF';

/**
 * Read access_token from sessionStorage, decode JWT, return role.
 * Returns null if no token or decode fails.
 */
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('access_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.role !== 'string') return null;
  const role = payload.role.toUpperCase();
  if (role === 'OWNER' || role === 'STAFF') return role;
  return null;
}
