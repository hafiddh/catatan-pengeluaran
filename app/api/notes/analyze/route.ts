import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/server/session';
import { callGemini } from '@/lib/server/gemini';
import { getPersonaConfig } from '@/lib/server/analyze-personas';
import { HOUSEHOLD_MEMBERS, type ScopeMode } from '@/lib/household';

export const maxDuration = 60;

type AnalyzeCategory = { kategori_label: string; count: number; total: number };

type AnalyzePeriod = {
  start_date: string;
  end_date: string;
  total_count: number;
  total_amount: number;
  categories: AnalyzeCategory[];
};

type AnalyzeRequest = AnalyzePeriod & {
  user_name?: string;
  prev_period?: AnalyzePeriod;
  compare_type?: 'prev_month' | 'vs_counterpart';
  tx_type?: 'pengeluaran' | 'pemasukan';
  persona?: string;
  scope?: ScopeMode;
};

function pct(total: number, of: number): string {
  if (of <= 0) return '0.0';
  return ((total / of) * 100).toFixed(1);
}

function buildPrompt(req: AnalyzeRequest, userName: string): string {
  const persona = getPersonaConfig(req.persona);
  const txLabel = req.tx_type === 'pemasukan' ? 'pemasukan' : 'pengeluaran';

  const lines: string[] = [persona.intro, ''];
  lines.push(`Data ${txLabel} dari ${req.start_date} hingga ${req.end_date}:`);
  lines.push(
    `Total transaksi: ${req.total_count} | Total ${txLabel}: Rp ${req.total_amount}\n\nRincian per kategori:`,
  );
  for (const cat of req.categories) {
    lines.push(`- ${cat.kategori_label}: ${cat.count} transaksi, Rp ${cat.total} (${pct(cat.total, req.total_amount)}%)`);
  }

  if (req.prev_period) {
    if (req.compare_type === 'vs_counterpart') {
      const counterLabel = req.tx_type === 'pemasukan' ? 'pengeluaran' : 'pemasukan';
      const counterLabelCap = counterLabel === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
      lines.push(`\n${counterLabelCap} di periode yang sama (${req.prev_period.start_date} – ${req.prev_period.end_date}):`);
      lines.push(`Total ${counterLabel}: Rp ${req.prev_period.total_amount} | ${req.prev_period.total_count} transaksi`);
      if (req.prev_period.categories.length > 0) {
        lines.push(`\nRincian per kategori ${counterLabel}:`);
        for (const cat of req.prev_period.categories) {
          lines.push(`- ${cat.kategori_label}: ${cat.count} transaksi, Rp ${cat.total} (${pct(cat.total, req.prev_period.total_amount)}%)`);
        }
      }

      const diff =
        req.tx_type === 'pemasukan'
          ? req.total_amount - req.prev_period.total_amount
          : req.prev_period.total_amount - req.total_amount;

      if (diff >= 0) {
        lines.push(`\nSelisih (pemasukan - pengeluaran): Rp ${diff} (SURPLUS)`);
        lines.push(`\n[KONDISI: BAGUS/SURPLUS] ${persona.surplusTone}`);
      } else {
        lines.push(`\nSelisih (pemasukan - pengeluaran): Rp ${diff} (DEFISIT)`);
        lines.push(`\n[KONDISI: PERLU PERHATIAN/DEFISIT] ${persona.defisitTone}`);
      }
    } else {
      lines.push(`\nData ${txLabel} bulan sebelumnya (${req.prev_period.start_date} – ${req.prev_period.end_date}):`);
      lines.push(
        `Total transaksi: ${req.prev_period.total_count} | Total ${txLabel}: Rp ${req.prev_period.total_amount}\n\nRincian per kategori:`,
      );
      for (const cat of req.prev_period.categories) {
        lines.push(`- ${cat.kategori_label}: ${cat.count} transaksi, Rp ${cat.total} (${pct(cat.total, req.prev_period.total_amount)}%)`);
      }
      if (req.total_amount <= req.prev_period.total_amount) {
        lines.push(`\n[PERUBAHAN: MEMBAIK] ${persona.membaikTone}`);
      } else {
        lines.push(`\n[PERUBAHAN: MEMBURUK] ${persona.memburukTone}`);
      }
    }
  }

  if (req.scope === 'household') {
    const names = HOUSEHOLD_MEMBERS.map((member) => member.name).join(' dan ');
    lines.push(
      `
Catatan penting: semua angka di atas adalah data gabungan ${names} (satu rumah tangga), bukan milik ${userName} seorang. Bicarakan sebagai keuangan bersama.`,
    );
  }

  lines.push('');
  lines.push(`${persona.writingStyle} `);

  if (req.prev_period && req.compare_type === 'vs_counterpart') {
    lines.push(
      'Bahas: (1) kondisi keuangan surplus/defisit dan apa artinya, (2) kategori terbesar dan apakah wajar dibanding pembandingnya, (3) saran konkret yang actionable. ',
    );
  } else if (req.prev_period) {
    lines.push(
      'Bahas: (1) perbandingan bulan ini vs bulan lalu secara overall, (2) kategori yang paling berubah signifikan, (3) saran konkret yang realistis. ',
    );
  } else {
    lines.push(
      `Karena tidak ada data pembanding (tidak ada pemasukan atau perbandingan bulan lalu), pakai total ${txLabel} itu sendiri sebagai pembanding utama. `,
    );
    lines.push(
      `Untuk setiap kategori, lihat persentasenya terhadap total ${txLabel} (sudah dihitung di rincian di atas) — kategori yang persentasenya besar tapi sifatnya kurang penting/tidak esensial (misal rokok, judi, hiburan berlebih, jajan/snack tidak perlu, hobi mahal, langganan tidak terpakai) wajib disorot sebagai potensi penghematan. `,
    );
    lines.push(
      `Bahas: (1) kategori terbesar berdasarkan persentase dari total ${txLabel} dan apakah proporsinya wajar untuk kebutuhan tersebut, (2) kategori yang terlihat kurang penting tapi makan porsi besar dari total ${txLabel} — hitung berapa rupiah dan persentase yang sebenarnya bisa dihemat kalau kategori itu dikurangi, (3) saran konkret kategori mana yang harus dipangkas duluan dan target persentase idealnya dari total ${txLabel}. `,
    );

    if (req.tx_type !== 'pemasukan') {
      lines.push('\n[KONDISI: TENTUKAN BERDASARKAN ANALISIS POLA] Putuskan tone berdasarkan hasil analisismu sendiri. ');
      lines.push(
        `Kalau total pengeluaran didominasi kebutuhan primer/esensial (makan, kos/sewa, transportasi rutin, listrik/air, kesehatan, pendidikan, kebutuhan keluarga) — pakai NADA SEHAT berikut: ${persona.sehatTone} `,
      );
      lines.push(
        `Tapi kalau ada kategori non-esensial/tidak penting (rokok, judi, hiburan berlebih, jajan tidak perlu, hobi mahal, langganan tidak terpakai) yang makan porsi signifikan (kira-kira 10% atau lebih dari total pengeluaran) — pakai NADA BOROS berikut: ${persona.borosTone} Pilih salah satu tone, jangan campur. Justifikasi pilihan tone secara implisit lewat nominal dan persentase yang kamu sebutkan. `,
      );
    }
  }

  lines.push(`Tulis dalam 4-5 paragraf pendek tanpa bullet points, langsung pakai kata '${userName}'. `);
  lines.push('Tampilkan nominal atau persentase penting dengan bold markdown (**contoh: Rp 500.000** atau **40%**). ');
  lines.push(`${persona.toneStyle} `);
  lines.push(`Jangan menyebutkan bahwa ini adalah hasil analisis data, langsung berikan insight dan saran seolah kamu benar-benar mengenal ${userName}.`);

  return lines.join('\n');
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
    return NextResponse.json({ message: 'Fitur analisa belum dikonfigurasi' }, { status: 503 });
  }

  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body tidak valid' }, { status: 400 });
  }

  if (!body.categories || body.categories.length === 0) {
    return NextResponse.json({ message: 'Tidak ada data untuk dianalisa' }, { status: 400 });
  }

  const rawName = (body.user_name ?? '').trim();
  const userName = rawName ? rawName.split(/\s+/)[0] : 'kamu';

  const prompt = buildPrompt(body, userName);

  try {
    const { text, model } = await callGemini(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
    });
    return NextResponse.json({ analysis: `${text}\n\n****${model}` });
  } catch (err) {
    return NextResponse.json(
      { message: `Gagal menganalisa data: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }
}
