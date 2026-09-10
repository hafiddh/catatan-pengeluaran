import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { createIncomeType, listIncomeTypes } from '@/lib/server/income-types';

export async function GET() {
  try {
    const user = await requireUser();
    const items = await listIncomeTypes(user.id);
    return NextResponse.json(items);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: { label?: string; icon?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  const label = (body.label ?? '').trim();
  const icon = (body.icon ?? '').trim();
  if (!label) {
    return NextResponse.json({ message: 'Label wajib diisi' }, { status: 400 });
  }
  if (!icon) {
    return NextResponse.json({ message: 'Icon wajib diisi' }, { status: 400 });
  }

  try {
    const item = await createIncomeType(user.id, label, icon);
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Gagal membuat data' }, { status: 500 });
  }
}
