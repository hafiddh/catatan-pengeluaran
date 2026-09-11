import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import {
  getIncomeTypeById,
  NotFoundError,
  softDeleteIncomeType,
  updateIncomeType,
} from '@/lib/server/income-types';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const item = await getIncomeTypeById(id);
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    throw err;
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
    const item = await updateIncomeType(user.id, id, label, icon);
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengubah data' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    throw err;
  }

  try {
    await softDeleteIncomeType(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus data' }, { status: 500 });
  }
}
