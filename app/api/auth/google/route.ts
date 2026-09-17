import { NextResponse } from 'next/server';
import { verifyGoogleCredential } from '@/lib/server/google-auth';
import { issueTokens } from '@/lib/server/auth-config';
import { setAuthCookies } from '@/lib/server/cookies';

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

  const { accessToken, refreshToken } = await issueTokens(user);

  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({ user });
}
