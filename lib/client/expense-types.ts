// lib/client/expense-types.ts
import { apiFetch, getErrorMessage } from "./api";

export type ExpenseType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function listExpenseTypes(): Promise<ExpenseType[]> {
  const res = await apiFetch("/expense-types", { method: "GET" });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal mengambil jenis pengeluaran"),
    );
  }

  return (await res.json()) as ExpenseType[];
}

export async function createExpenseType(payload: {
  label: string;
  icon: string;
}): Promise<ExpenseType> {
  const res = await apiFetch("/expense-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal membuat jenis pengeluaran"),
    );
  }

  return (await res.json()) as ExpenseType;
}
