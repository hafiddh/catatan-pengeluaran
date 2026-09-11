import { NextResponse } from 'next/server';
import { verifyGoogleCredential } from '@/lib/server/google-auth';
import { signToken } from '@/lib/server/jwt';
import { setAuthCookies } from '@/lib/server/cookies';

const ACCESS_TTL_SECONDS = 60 * 60 * 2;
const REFRESH_TTL_SECONDS = 60 * 60 * 24;

export async function POST(request: Request) {
  let body: { credential?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  const credential = body.credential ?? '';

  let user;
  try {
    user = await verifyGoogleCredential(credential, process.env.GOOGLE_CLIENT_ID ?? '');
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Verifikasi Google gagal' },
      { status: 401 },
    );
  }

  const secret = process.env.JWT_SECRET ?? '';
  const [accessToken, refreshToken] = await Promise.all([
    signToken(secret, user, 'access', ACCESS_TTL_SECONDS),
    signToken(secret, user, 'refresh', REFRESH_TTL_SECONDS),
  ]);

  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({ user });
}
