"use client";

import { getExpenseIcon } from "@/lib/client/expense-icons";
import type { ExpenseType } from "@/lib/client/expense-types";
import { Plus } from "lucide-react";

type ExpenseTypePillsProps = {
  items: ExpenseType[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  onAdd?: () => void;
};

export function getExpenseTypeIcon(
  iconName: string | null | undefined,
  _label?: string,
) {
  const Icon = getExpenseIcon(iconName);
  return <Icon className="w-4 h-4" />;
}

export function ExpenseTypePills({
  items,
  value,
  onChange,
  disabled,
  className,
  onAdd,
}: ExpenseTypePillsProps) {
  return (
    <div className={"flex flex-wrap justify-center gap-1.5 " + (className || "")}>
      {items.map((it) => {
        const selected = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(it.id)}
            className={
              "group inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-sm transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50 sm:text-sm " +
              (selected
                ? "-translate-y-0.5 border-white/70 bg-white/70 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-white"
                : "border-white/45 bg-white/35 text-slate-700 hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45 dark:hover:text-slate-50")
            }
          >
            <span
              aria-hidden="true"
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border leading-none transition-all duration-300 ease-out sm:h-7 sm:w-7 " +
                (selected
                  ? "border-slate-200 bg-white/90 text-slate-800 shadow-[0_8px_20px_rgba(148,163,184,0.18)] dark:border-slate-600/80 dark:bg-slate-700/70 dark:text-slate-100"
                  : "border-transparent bg-transparent text-current group-hover:border-white/35 group-hover:bg-white/20 dark:group-hover:border-slate-700/70 dark:group-hover:bg-slate-800/35")
              }
            >
              {getExpenseTypeIcon(it.icon, it.label)}
            </span>
            <span
              className={
                selected
                  ? "tracking-[0.01em] text-slate-700 dark:text-slate-100"
                  : "text-current"
              }
            >
              {it.label}
            </span>
          </button>
        );
      })}

      {onAdd && (
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          title="Tambah jenis pengeluaran"
          className="group inline-flex items-center gap-1.5 rounded-xl border border-dashed px-2 border-slate-300/70   text-xs font-semibold text-slate-500 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-400/70 hover:bg-white/30 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:border-slate-600/60 dark:text-slate-500 dark:hover:border-slate-500/70 dark:hover:bg-slate-800/30 dark:hover:text-slate-300 dark:focus:ring-slate-500/50 sm:text-sm"
        >
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300/70 leading-none transition-all duration-300 ease-out group-hover:border-slate-400/70 group-hover:bg-white/20 dark:border-slate-600/60 dark:group-hover:border-slate-500/70 dark:group-hover:bg-slate-800/35 sm:h-7 sm:w-7"
          >
            <Plus className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}
