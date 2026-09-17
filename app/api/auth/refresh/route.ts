import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/jwt';
import { issueTokens, jwtSecret } from '@/lib/server/auth-config';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/server/cookies';

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token diperlukan' }, { status: 400 });
  }

  let user;
  try {
    const claims = await verifyToken(jwtSecret(), refreshToken, 'refresh');
    user = claims.user;
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ message: 'Refresh token tidak valid' }, { status: 401 });
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);
  await setAuthCookies(accessToken, newRefreshToken);

  return NextResponse.json({ user });
}
