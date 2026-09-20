import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { summarizeShoppingNotes } from '@/lib/server/notes';

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
  const jenisTransaksi = url.searchParams.get('jenis_transaksi')?.trim() ?? '';
  // Default household supaya laporan tetap gabungan; 'own' dipakai analisa AI.
  const scope = url.searchParams.get('scope')?.trim() === 'own' ? 'own' : 'household';
  const ownerId = url.searchParams.get('user_id')?.trim() ?? '';

  try {
    const summary = await summarizeShoppingNotes(
      process.env.NOTES_ENCRYPT_KEY ?? '',
      user.id,
      { startDate, endDate, jenisTransaksi, scope, ownerId },
    );
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ message: 'Gagal mengambil data' }, { status: 500 });
  }
}
