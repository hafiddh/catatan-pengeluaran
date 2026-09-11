"use client";

import { EXPENSE_ICONS } from "@/lib/client/expense-icons";
import { createExpenseType, type ExpenseType } from "@/lib/client/expense-types";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onCreated: (newType: ExpenseType) => void;
};

export function AddExpenseTypeDialog({
  isOpen,
  onClose,
  token,
  onCreated,
}: Props) {
  const [label, setLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setSelectedIcon("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return setError("Nama jenis wajib diisi");
    if (!selectedIcon) return setError("Pilih icon terlebih dahulu");

    setIsSaving(true);
    setError("");
    try {
      const created = await createExpenseType({
        label: trimmedLabel,
        icon: selectedIcon,
      });
      onCreated(created);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Gagal membuat jenis pengeluaran",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/45 bg-white/95 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tambah jenis pengeluaran
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100/60 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nama
          </label>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="contoh: Transportasi"
            className="w-full rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm backdrop-blur-sm transition-all focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:ring-slate-500/50"
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-1 rounded-xl border border-slate-200/60 bg-slate-50/70 p-2 dark:border-slate-700/40 dark:bg-slate-800/40">
            {Object.entries(EXPENSE_ICONS).map(([key, { Icon, label: iconLabel }]) => {
              const selected = selectedIcon === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={iconLabel}
                  onClick={() => {
                    setSelectedIcon(key);
                    setError("");
                  }}
                  className={
                    "flex flex-col items-center justify-center gap-0.5 rounded-lg p-2 transition-all duration-150 " +
                    (selected
                      ? "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="w-full truncate text-center text-[9px] font-medium leading-none">
                    {iconLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="mb-3 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200/70 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100/60 disabled:opacity-50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-800/50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-xl border border-white/70 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/80 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
