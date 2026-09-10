import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/server/jwt';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'JWT tidak valid' }, { status: 401 });
  }

  try {
    await verifyToken(process.env.JWT_SECRET ?? '', token, 'access');
  } catch {
    return NextResponse.json({ message: 'JWT tidak valid' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
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
