import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: err.message }, { status: 401 });
    }
    throw err;
  }
}
