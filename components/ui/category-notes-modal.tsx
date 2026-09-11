"use client";

import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills";
import { listShoppingNotes, type ShoppingNote } from "@/lib/client/notes";
import { FileText, LoaderCircle, Package, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  kategoriId: string;
  kategoriLabel: string;
  kategoriIcon: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function CategoryNotesModal({
  isOpen,
  onClose,
  kategoriId,
  kategoriLabel,
  kategoriIcon,
  startDate,
  endDate,
  totalAmount,
}: Props) {
  const [notes, setNotes] = useState<ShoppingNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !kategoriId) return;

    let active = true;
    setNotes([]);
    setError("");
    setIsLoading(true);

    listShoppingNotes({
      startDate,
      endDate,
      kategoriId,
      limit: 100,
      page: 1,
    })
      .then((res) => {
        if (!active) return;
        setNotes(res.data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Gagal mengambil data");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, kategoriId, startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/45 bg-white/95 shadow-[0_-12px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95 sm:h-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl sm:shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100/80 px-5 py-4 dark:border-slate-800/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
              {getExpenseTypeIcon(kategoriIcon, kategoriLabel)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                {kategoriLabel}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {notes.length} transaksi &middot; {formatCurrency(totalAmount)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {formatDate(startDate)} – {formatDate(endDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/60 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-15">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Memuat data...
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : notes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada data untuk periode ini.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100/80 dark:divide-slate-800/70">
              {notes.map((note) => (
                <li key={note.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatDate(note.tanggal)}
                      </p>

                      {(note.nama_barang || note.catatan) && (
                        <div className="mt-1.5 space-y-1">
                          {note.nama_barang && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="text-sm text-slate-800 dark:text-slate-200">
                                {note.jumlah_barang
                                  ? `${note.jumlah_barang}x `
                                  : ""}
                                {note.nama_barang}
                              </span>
                            </div>
                          )}
                          {note.catatan && (
                            <div className="flex items-start gap-1.5">
                              <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="text-xs italic text-slate-400 dark:text-slate-500">
                                {note.catatan}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="shrink-0 text-base font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                      {formatCurrency(note.jumlah)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer total */}
        {!isLoading && !error && notes.length > 0 && (
          <div className="shrink-0 border-t border-slate-100/80 px-5 pb-5 pt-3.5 dark:border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Total
              </span>
              <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
