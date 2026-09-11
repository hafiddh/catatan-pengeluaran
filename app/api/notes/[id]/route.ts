import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import {
  getShoppingNoteById,
  NotFoundError,
  softDeleteShoppingNote,
  updateShoppingNote,
} from '@/lib/server/notes';

type Params = { params: Promise<{ id: string }> };

function notesSecret(): string {
  return process.env.NOTES_ENCRYPT_KEY ?? '';
}

async function requireUserOr401() {
  try {
    return await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return null;
    }
    throw err;
  }
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUserOr401();
  if (!user) {
    return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const note = await getShoppingNoteById(notesSecret(), user.id, id);
    return NextResponse.json(note);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUserOr401();
  if (!user) {
    return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    tanggal?: string;
    jumlah?: number;
    jenis_transaksi?: string;
    kategori_id?: string;
    nama_barang?: string;
    jumlah_barang?: number;
    catatan?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  let tanggal = (body.tanggal ?? '').trim();
  if (!tanggal) {
    tanggal = new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json(
      { message: 'Tanggal tidak valid (format: YYYY-MM-DD)' },
      { status: 400 },
    );
  }

  const jenis = (body.jenis_transaksi ?? '').trim() || 'pengeluaran';
  const kategori = (body.kategori_id ?? '').trim();
  if (!kategori) {
    return NextResponse.json({ message: 'Kategori id wajib diisi' }, { status: 400 });
  }

  const jumlah = body.jumlah ?? 0;
  if (jumlah <= 0) {
    return NextResponse.json({ message: 'Jumlah harus lebih dari 0' }, { status: 400 });
  }

  try {
    const note = await updateShoppingNote(
      notesSecret(),
      user.id,
      id,
      jenis,
      kategori,
      jumlah,
      tanggal,
      (body.nama_barang ?? '').trim(),
      body.jumlah_barang ?? 0,
      (body.catatan ?? '').trim(),
    );
    return NextResponse.json(note);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengubah data' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUserOr401();
  if (!user) {
    return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await softDeleteShoppingNote(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus data' }, { status: 500 });
  }
}
