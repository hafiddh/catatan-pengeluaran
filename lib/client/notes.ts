// lib/client/notes.ts
import { apiFetch, getErrorMessage } from "./api";
import type { ScopeMode } from "../household";

export type CreateShoppingNoteRequest = {
  tanggal: string;
  jumlah: number;
  jenis_transaksi: string;
  kategori_id: string;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
};

export type ShoppingNote = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  // Label kategori di-join di server: kategori milik partner tidak ada di
  // daftar kategori user yang sedang login.
  kategori_label: string;
  kategori_icon: string;
  jumlah: number;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
  tanggal: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type ListNotesParams = {
  startDate?: string;
  endDate?: string;
  kategoriId?: string;
  jenisTransaksi?: string;
  page?: number;
  limit?: number;
};

export type ListNotesResult = {
  data: ShoppingNote[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
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

export async function createShoppingNote(
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  const res = await apiFetch("/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menyimpan catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function listShoppingNotes(
  params: ListNotesParams = {},
): Promise<ListNotesResult> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.kategoriId) query.set("kategori_id", params.kategoriId);
  if (params.jenisTransaksi) query.set("jenis_transaksi", params.jenisTransaksi);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const res = await apiFetch(`/notes${qs ? `?${qs}` : ""}`, { method: "GET" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ListNotesResult;
}

export async function getShoppingNotesSummary(
  params: {
    startDate?: string;
    endDate?: string;
    jenisTransaksi?: string;
    scope?: ScopeMode;
  } = {},
): Promise<NotesSummary> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.jenisTransaksi) query.set("jenis_transaksi", params.jenisTransaksi);
  if (params.scope) query.set("scope", params.scope);

  const qs = query.toString();
  const res = await apiFetch(`/notes/summary${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil laporan"));
  }

  return (await res.json()) as NotesSummary;
}

export async function getShoppingNoteByID(id: string): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, { method: "GET" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function updateShoppingNote(
  id: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengubah catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function deleteShoppingNote(id: string): Promise<void> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menghapus catatan"));
  }
}

export type AnalyzePeriod = {
  start_date: string;
  end_date: string;
  total_count: number;
  total_amount: number;
  categories: Array<{ kategori_label: string; count: number; total: number }>;
};

export type AnalyzeRequest = {
  start_date: string;
  end_date: string;
  total_count: number;
  total_amount: number;
  categories: Array<{ kategori_label: string; count: number; total: number }>;
  user_name?: string;
  prev_period?: AnalyzePeriod;
  compare_type?: string;
  tx_type?: string;
  persona?: string;
  scope?: ScopeMode;
};

export async function analyzeExpenses(payload: AnalyzeRequest): Promise<string> {
  const res = await apiFetch("/notes/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menganalisa data"));
  }

  const data = (await res.json()) as { analysis: string };
  return data.analysis;
}
