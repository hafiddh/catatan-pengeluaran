import { cookies } from 'next/headers';
import { verifyToken, type AuthUser } from './jwt';
import { ACCESS_TOKEN_COOKIE, jwtSecret } from './auth-config';

export class UnauthorizedError extends Error {}

/**
 * Reads and verifies the access_token cookie. Every protected Route
 * Handler calls this itself (never trusts proxy.ts alone) per Next.js's
 * recommended Data Access Layer pattern.
 */
export async function requireUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    throw new UnauthorizedError('JWT tidak valid');
  }

  try {
    const claims = await verifyToken(jwtSecret(), token, 'access');
    return claims.user;
  } catch {
    throw new UnauthorizedError('JWT tidak valid');
  }
}
