import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, type AuthUser } from '@/lib/server/jwt';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TTL_SECONDS,
  cookieOptions,
  issueTokens,
  jwtSecret,
} from '@/lib/server/auth-config';

async function readUser(request: NextRequest, name: string, type: 'access' | 'refresh'): Promise<AuthUser | null> {
  const token = request.cookies.get(name)?.value;
  if (!token) return null;
  try {
    const claims = await verifyToken(jwtSecret(), token, type);
    return claims.user;
  } catch {
    return null;
  }
}

function unauthorized(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ message: 'JWT tidak valid' }, { status: 401 });
  }
  // Pages decide for themselves: "/" shows the login screen, the (app)
  // layout redirects to /login.
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  if (await readUser(request, ACCESS_TOKEN_COOKIE, 'access')) {
    return NextResponse.next();
  }

  // Access token missing or expired: silently renew it from the refresh
  // token so the user stays signed in for the refresh token's lifetime.
  const user = await readUser(request, REFRESH_TOKEN_COOKIE, 'refresh');
  if (!user) {
    return unauthorized(request);
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  // Forward the new tokens to this request's Route Handler / Server
  // Component, which read cookies from the request headers.
  request.cookies.set(ACCESS_TOKEN_COOKIE, accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('cookie', request.cookies.toString());

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SECONDS));
  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/list/:path*',
    '/laporan/:path*',
    '/profile/:path*',
    '/api/me',
    '/api/expense-types',
    '/api/expense-types/:path*',
    '/api/income-types',
    '/api/income-types/:path*',
    '/api/notes',
    '/api/notes/:path*',
    '/api/scan-receipt',
    '/api/voice-note',
  ],
};
