import { cookies } from 'next/headers';

const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 2; // 2h, matches Go's AccessTokenTTL
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h, matches Go's RefreshTokenTTL

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('access_token', '', {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  cookieStore.set('refresh_token', '', {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('refresh_token')?.value ?? null;
}
