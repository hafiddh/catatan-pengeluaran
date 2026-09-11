// lib/client/income-types.ts
import { apiFetch, getErrorMessage } from "./api";

export type IncomeType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function listIncomeTypes(): Promise<IncomeType[]> {
  const res = await apiFetch("/income-types", { method: "GET" });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal mengambil jenis pemasukan"),
    );
  }

  return (await res.json()) as IncomeType[];
}

export async function createIncomeType(payload: {
  label: string;
  icon: string;
}): Promise<IncomeType> {
  const res = await apiFetch("/income-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal membuat jenis pemasukan"),
    );
  }

  return (await res.json()) as IncomeType;
}
