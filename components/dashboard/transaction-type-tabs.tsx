"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

export type TransactionType = "pengeluaran" | "pemasukan";

type Props = {
  value: TransactionType;
  onChange: (v: TransactionType) => void;
};

export function TransactionTypeTabs({ value, onChange }: Props) {
  return (
    <div className="flex rounded-2xl p-1.5 bg-gray-100 dark:bg-slate-800 mb-4 gap-1">
      <button
        type="button"
        onClick={() => onChange("pengeluaran")}
        className={
          "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 " +
          (value === "pengeluaran"
            ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100"
            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200")
        }
      >
        <TrendingDown className="w-4 h-4 shrink-0" />
        Pengeluaran
      </button>
      <button
        type="button"
        onClick={() => onChange("pemasukan")}
        className={
          "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 " +
          (value === "pemasukan"
            ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100"
            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200")
        }
      >
        <TrendingUp className="w-4 h-4 shrink-0" />
        Pemasukan
      </button>
    </div>
  );
}
