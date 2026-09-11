import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { createShoppingNote, listShoppingNotes } from '@/lib/server/notes';

function notesSecret(): string {
  return process.env.NOTES_ENCRYPT_KEY ?? '';
}

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 401 });
    }
    throw err;
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date')?.trim() ?? '';
  const endDate = url.searchParams.get('end_date')?.trim() ?? '';
  const kategoriId = url.searchParams.get('kategori_id')?.trim() ?? '';
  const jenisTransaksi = url.searchParams.get('jenis_transaksi')?.trim() ?? '';

  let page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) limit = 20;

  try {
    const result = await listShoppingNotes(notesSecret(), user.id, {
      startDate,
      endDate,
      kategoriId,
      jenisTransaksi,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      data: result.items,
      total: result.total,
      page,
      limit,
      has_next: (page - 1) * limit + result.items.length < result.total,
    });
  } catch {
    return NextResponse.json({ message: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 401 });
    }
    throw err;
  }

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
    const note = await createShoppingNote(
      notesSecret(),
      user.id,
      jenis,
      kategori,
      jumlah,
      tanggal,
      (body.nama_barang ?? '').trim(),
      body.jumlah_barang ?? 0,
      (body.catatan ?? '').trim(),
    );
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: `Gagal menyimpan transaksi: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 },
    );
  }
}
