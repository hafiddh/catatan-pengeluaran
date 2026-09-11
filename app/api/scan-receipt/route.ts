import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { callGemini } from '@/lib/server/gemini';

export const maxDuration = 60;

const RECEIPT_PROMPT = `You are a receipt parser. Extract purchased items from receipt images and return ONLY a valid JSON array.

Output schema per item:
- "nama_barang": string (item name as-is)
- "jumlah": number (quantity)
- "total_harga": number (line total, plain integer)

Strict rules:
- Exclude: cancelled items, discounts, vouchers, taxes, subtotals, totals
- No markdown, no explanation, no code blocks
- Output must be directly parseable by JSON.parse()`;

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
      { message: 'Fitur scan struk belum dikonfigurasi' },
      { status: 503 },
    );
  }

  let body: { image_base64?: string; mime_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  const imageBase64 = body.image_base64 ?? '';
  if (!imageBase64) {
    return NextResponse.json({ message: 'image_base64 wajib diisi' }, { status: 400 });
  }
  const mimeType = body.mime_type || 'image/jpeg';

  try {
    const { text } = await callGemini(apiKey, {
      contents: [
        {
          parts: [
            { text: RECEIPT_PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
    });
    const items = extractJsonArray(text);
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json(
      { message: `Gagal memproses struk: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }
}
