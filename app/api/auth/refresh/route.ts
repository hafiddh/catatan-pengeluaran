import { NextResponse } from 'next/server';
import { signToken, verifyToken } from '@/lib/server/jwt';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/server/cookies';

const ACCESS_TTL_SECONDS = 60 * 60 * 2;
const REFRESH_TTL_SECONDS = 60 * 60 * 24;

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token diperlukan' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET ?? '';
  let user;
  try {
    const claims = await verifyToken(secret, refreshToken, 'refresh');
    user = claims.user;
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ message: 'Refresh token tidak valid' }, { status: 401 });
  }

  const [newAccessToken, newRefreshToken] = await Promise.all([
    signToken(secret, user, 'access', ACCESS_TTL_SECONDS),
    signToken(secret, user, 'refresh', REFRESH_TTL_SECONDS),
  ]);

  await setAuthCookies(newAccessToken, newRefreshToken);

  return NextResponse.json({ user });
}
