import { randomUUID } from 'node:crypto';
import { getPool } from './db';
import { decryptInt64, encryptInt64 } from './crypto';
import { householdScope, resolveScope, type ScopeMode } from '../household';

export type ShoppingNote = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  kategori_label: string;
  kategori_icon: string;
  jumlah: number;
  nama_barang: string;
  jumlah_barang: number;
  catatan: string;
  tanggal: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type ListNotesParams = {
  startDate: string;
  endDate: string;
  kategoriId: string;
  jenisTransaksi: string;
  limit: number;
  offset: number;
};

export type ListNotesResult = {
  items: ShoppingNote[];
  total: number;
};

export type NotesSummaryItem = {
  kategori_id: string;
  kategori_label: string;
  icon: string;
  count: number;
  total: number;
};

export type NotesSummary = {
  total_count: number;
  total_amount: number;
  categories: NotesSummaryItem[];
};

export class NotFoundError extends Error {}

function formatDate(value: string | Date): string {
  // db.ts registers a raw-string type parser for Postgres `date` (OID 1082),
  // so this is normally already 'YYYY-MM-DD'. The Date branch is a defensive
  // fallback only — .toISOString() must NOT be used here, since it converts
  // through UTC and shifts the date backward on any server east of UTC.
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type RawNoteRow = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  kategori_label: string | null;
  kategori_icon: string | null;
  jumlah: string;
  nama_barang: string | null;
  jumlah_barang: number | null;
  catatan: string | null;
  tanggal: string | Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

function toShoppingNote(row: RawNoteRow, secret: string): ShoppingNote {
  return {
    id: row.id,
    user_id: row.user_id,
    jenis_transaksi: row.jenis_transaksi,
    kategori_id: row.kategori_id,
    kategori_label: row.kategori_label ?? '',
    kategori_icon: row.kategori_icon ?? '',
    jumlah: decryptInt64(secret, row.jumlah),
    nama_barang: row.nama_barang ?? '',
    jumlah_barang: row.jumlah_barang ?? 0,
    catatan: row.catatan ?? '',
    tanggal: formatDate(row.tanggal),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

const NOTE_COLUMNS = `t.id, t.user_id, t.jenis_transaksi, t.kategori_id, t.jumlah, t.nama_barang, t.jumlah_barang, t.catatan, t.tanggal, t.created_at, t.updated_at, t.deleted_at`;

// Label kategori ikut di-join di sini, bukan dipetakan di client: jenis
// pengeluaran/pemasukan tetap milik masing-masing user, jadi client tidak punya
// kategori milik partner untuk diterjemahkan sendiri.
const NOTE_SELECT = `SELECT ${NOTE_COLUMNS},
            COALESCE(jp.label, jpm.label, '') AS kategori_label,
            COALESCE(jp.icon, jpm.icon, '') AS kategori_icon
     FROM transaksi t
     LEFT JOIN jenis_pengeluaran jp ON jp.id = t.kategori_id AND jp.deleted_at IS NULL
     LEFT JOIN jenis_pemasukan jpm ON jpm.id = t.kategori_id AND jpm.deleted_at IS NULL`;

export async function createShoppingNote(
  secret: string,
  userId: string,
  jenisTransaksi: string,
  kategoriId: string,
  jumlah: number,
  tanggal: string,
  namaBarang: string,
  jumlahBarang: number,
  catatan: string,
): Promise<ShoppingNote> {
  const id = randomUUID();
  const jumlahEncrypted = encryptInt64(secret, jumlah);

  await getPool().query(
    `INSERT INTO transaksi (id, user_id, jenis_transaksi, kategori_id, jumlah, nama_barang, jumlah_barang, catatan, tanggal, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, 0), NULLIF($8, ''), $9, now(), now())`,
    [id, userId, jenisTransaksi, kategoriId, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal],
  );
  // Baca ulang lewat NOTE_SELECT supaya label kategori ikut terisi.
  return getShoppingNoteById(secret, userId, id);
}

function buildNotesWhere(
  userId: string,
  params: Pick<ListNotesParams, 'startDate' | 'endDate' | 'kategoriId' | 'jenisTransaksi'>,
): { clause: string; values: unknown[] } {
  // Baca lintas anggota household; tulis tetap milik sendiri (lihat update/delete).
  const conditions = ['t.user_id = ANY($1)', 't.deleted_at IS NULL'];
  const values: unknown[] = [householdScope(userId)];

  if (params.startDate) {
    values.push(params.startDate);
    conditions.push(`t.tanggal >= $${values.length}`);
  }
  if (params.endDate) {
    values.push(params.endDate);
    conditions.push(`t.tanggal <= $${values.length}`);
  }
  if (params.kategoriId) {
    values.push(params.kategoriId);
    conditions.push(`t.kategori_id = $${values.length}`);
  }
  if (params.jenisTransaksi) {
    values.push(params.jenisTransaksi);
    conditions.push(`t.jenis_transaksi = $${values.length}`);
  }

  return { clause: conditions.join(' AND '), values };
}

export async function listShoppingNotes(
  secret: string,
  userId: string,
  params: ListNotesParams,
): Promise<ListNotesResult> {
  const { clause, values } = buildNotesWhere(userId, params);

  const countResult = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) FROM transaksi t WHERE ${clause}`,
    values,
  );
  const total = Number.parseInt(countResult.rows[0].count, 10);

  const limit = params.limit > 0 ? params.limit : 20;
  const offset = params.offset >= 0 ? params.offset : 0;
  const pageValues = [...values, limit, offset];

  const { rows } = await getPool().query<RawNoteRow>(
    `${NOTE_SELECT}
     WHERE ${clause}
     ORDER BY t.tanggal DESC, t.created_at DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );

  return { items: rows.map((row) => toShoppingNote(row, secret)), total };
}

export async function getShoppingNoteById(
  secret: string,
  userId: string,
  id: string,
): Promise<ShoppingNote> {
  const { rows } = await getPool().query<RawNoteRow>(
    `${NOTE_SELECT}
     WHERE t.id = $1 AND t.user_id = ANY($2) AND t.deleted_at IS NULL
     LIMIT 1`,
    [id, householdScope(userId)],
  );
  if (rows.length === 0) {
    throw new NotFoundError('note not found');
  }
  return toShoppingNote(rows[0], secret);
}

export async function updateShoppingNote(
  secret: string,
  userId: string,
  id: string,
  jenisTransaksi: string,
  kategoriId: string,
  jumlah: number,
  tanggal: string,
  namaBarang: string,
  jumlahBarang: number,
  catatan: string,
): Promise<ShoppingNote> {
  const jumlahEncrypted = encryptInt64(secret, jumlah);

  // `user_id = $9`, bukan scope household: transaksi partner read-only.
  const result = await getPool().query(
    `UPDATE transaksi
     SET jenis_transaksi = $1, kategori_id = $2, jumlah = $3, nama_barang = NULLIF($4, ''),
         jumlah_barang = NULLIF($5, 0), catatan = NULLIF($6, ''), tanggal = $7, updated_at = now()
     WHERE id = $8 AND user_id = $9 AND deleted_at IS NULL`,
    [jenisTransaksi, kategoriId, jumlahEncrypted, namaBarang, jumlahBarang, catatan, tanggal, id, userId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('note not found');
  }

  return getShoppingNoteById(secret, userId, id);
}

export async function softDeleteShoppingNote(userId: string, id: string): Promise<void> {
  // Sama seperti update: hanya pemilik yang boleh menghapus.
  const result = await getPool().query(
    `UPDATE transaksi
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('note not found');
  }
}

export async function summarizeShoppingNotes(
  secret: string,
  userId: string,
  startDate: string,
  endDate: string,
  jenisTransaksi: string,
  scope: ScopeMode = 'household',
): Promise<NotesSummary> {
  const conditions = ['t.user_id = ANY($1)', 't.deleted_at IS NULL'];
  const values: unknown[] = [resolveScope(userId, scope)];

  if (startDate) {
    values.push(startDate);
    conditions.push(`t.tanggal >= $${values.length}`);
  }
  if (endDate) {
    values.push(endDate);
    conditions.push(`t.tanggal <= $${values.length}`);
  }
  if (jenisTransaksi) {
    values.push(jenisTransaksi);
    conditions.push(`t.jenis_transaksi = $${values.length}`);
  }

  const { rows } = await getPool().query<{
    kategori_id: string;
    label: string;
    icon: string;
    jumlah: string;
  }>(
    `SELECT t.kategori_id,
            COALESCE(jp.label, jpm.label, '') AS label,
            COALESCE(jp.icon, jpm.icon, '') AS icon,
            t.jumlah
     FROM transaksi t
     LEFT JOIN jenis_pengeluaran jp ON jp.id = t.kategori_id AND jp.deleted_at IS NULL
     LEFT JOIN jenis_pemasukan jpm ON jpm.id = t.kategori_id AND jpm.deleted_at IS NULL
     WHERE ${conditions.join(' AND ')}`,
    values,
  );

  const grouped = new Map<string, NotesSummaryItem>();
  let totalAmount = 0;
  let totalCount = 0;

  for (const row of rows) {
    const jumlah = decryptInt64(secret, row.jumlah);
    totalAmount += jumlah;
    totalCount += 1;

    const existing = grouped.get(row.kategori_id);
    if (existing) {
      existing.count += 1;
      existing.total += jumlah;
    } else {
      grouped.set(row.kategori_id, {
        kategori_id: row.kategori_id,
        kategori_label: row.label,
        icon: row.icon,
        count: 1,
        total: jumlah,
      });
    }
  }

  const categories = [...grouped.values()].sort((a, b) => b.total - a.total);

  return { total_count: totalCount, total_amount: totalAmount, categories };
}
