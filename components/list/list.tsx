"use client";

import {
  TransactionTypeTabs,
  type TransactionType,
} from "@/components/dashboard/transaction-type-tabs";
import { CalendarRange, ChevronDown, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { ListPemasukanView } from "./list-pemasukan";
import { ListPengeluaranView } from "./list-pengeluaran";

function getTodayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getFirstDayOfMonth(): string {
  return `${getTodayLocalISODate().slice(0, 8)}01`;
}

export function ListNotesPage() {
  const [transactionType, setTransactionType] =
    useState<TransactionType>("pengeluaran");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>(() =>
    getFirstDayOfMonth(),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayLocalISODate());

  return (
    <main className="min-h-screen pt-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/45 bg-white/35 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 sm:p-6">
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            aria-expanded={isFilterOpen}
            aria-controls="list-filter-panel"
          >
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Filter
              </h2>
            </div>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-700 transition-all duration-300 ease-out dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200">
                <ChevronDown
                  className={
                    "h-4 w-4 transition-transform duration-200 " +
                    (isFilterOpen ? "rotate-180" : "rotate-0")
                  }
                />
              </span>
            </span>
          </button>

          <div
            id="list-filter-panel"
            className={
              "grid overflow-hidden transition-all duration-300 ease-out " +
              (isFilterOpen
                ? "mt-4 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0")
            }
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Dari tanggal
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Sampai tanggal
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(getFirstDayOfMonth());
                    setEndDate(getTodayLocalISODate());
                  }}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/45 bg-white/35 px-3 py-2 text-xs font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        </section>

        <TransactionTypeTabs
          value={transactionType}
          onChange={setTransactionType}
        />

        {transactionType === "pengeluaran" ? (
          <ListPengeluaranView startDate={startDate} endDate={endDate} />
        ) : (
          <ListPemasukanView startDate={startDate} endDate={endDate} />
        )}
      </div>
    </main>
  );
}
