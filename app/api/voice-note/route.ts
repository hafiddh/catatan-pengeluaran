import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { callGemini } from '@/lib/server/gemini';

export const maxDuration = 60;

const VOICE_PROMPT = `Kamu adalah parser catatan keuangan. Dari kalimat berikut, ekstrak semua item pengeluaran dan kembalikan HANYA array JSON yang valid.

Schema per item:
- "nama_barang": string (nama barang/pengeluaran, kapitalkan huruf pertama setiap kata)
- "jumlah": number (kuantitas/banyaknya, default 1 jika tidak disebutkan)
- "total_harga": number (total harga dalam Rupiah, bilangan bulat tanpa titik/koma)

Aturan konversi harga:
- "ribu" / "rb" / "k" = × 1.000
- "juta" / "jt" = × 1.000.000
- Contoh: "25 ribu" = 25000, "1.5 juta" = 1500000, "50k" = 50000

Aturan ketat:
- Jangan sertakan markdown, penjelasan, atau code block
- Jika tidak ada harga yang disebutkan untuk suatu item, set total_harga ke 0
- Output harus langsung bisa di-parse oleh JSON.parse()`;

type ScannedReceiptItem = {
  nama_barang: string;
  jumlah: number;
  total_harga: number;
};

function extractJsonArray(text: string): ScannedReceiptItem[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('format respons tidak dikenali');
  }
  return JSON.parse(text.slice(start, end + 1)) as ScannedReceiptItem[];
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ message: err.message }, { status: 401 });
    }
    throw err;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Fitur voice note belum dikonfigurasi' },
      { status: 503 },
    );
  }

  let body: { transcript?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  const transcript = body.transcript ?? '';
  if (!transcript) {
    return NextResponse.json({ message: 'transcript wajib diisi' }, { status: 400 });
  }

  try {
    const { text } = await callGemini(apiKey, {
      contents: [{ parts: [{ text: `${VOICE_PROMPT}\n\nKalimat input:\n${transcript}` }] }],
    });
    const items = extractJsonArray(text);
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json(
      { message: `Gagal memproses voice note: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }
}
