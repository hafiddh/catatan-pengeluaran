import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TTL_SECONDS,
  cookieOptions,
} from './auth-config';

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SECONDS));
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, '', cookieOptions(0));
  cookieStore.set(REFRESH_TOKEN_COOKIE, '', cookieOptions(0));
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}
