import { cookies } from 'next/headers';
import { verifyToken, type AuthUser } from './jwt';

export class UnauthorizedError extends Error {}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

/**
 * Reads and verifies the access_token cookie. Every protected Route
 * Handler calls this itself (never trusts proxy.ts alone) per Next.js's
 * recommended Data Access Layer pattern.
 */
export async function requireUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
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
