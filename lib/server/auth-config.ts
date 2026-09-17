import { signToken, type AuthUser } from './jwt';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TTL_SECONDS = 60 * 60 * 2; // 2h
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 2; // 2 days

type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
};

export function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export async function issueTokens(
  user: AuthUser,
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = jwtSecret();
  const [accessToken, refreshToken] = await Promise.all([
    signToken(secret, user, 'access', ACCESS_TTL_SECONDS),
    signToken(secret, user, 'refresh', REFRESH_TTL_SECONDS),
  ]);
  return { accessToken, refreshToken };
}
