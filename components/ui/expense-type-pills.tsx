"use client";

import { getExpenseIcon } from "@/lib/client/expense-icons";
import type { ExpenseType } from "@/lib/client/expense-types";
import { createLongPressController, type LongPressController } from "@/lib/client/long-press";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ExpenseTypePillsProps = {
  items: ExpenseType[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  onAdd?: () => void;
  /** Kalau diisi, tahan pill untuk memunculkan tombol ubah. */
  onEdit?: (item: ExpenseType) => void;
  /** Kalau diisi, tahan pill untuk memunculkan tombol hapus. */
  onDelete?: (item: ExpenseType) => void;
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
  onEdit,
  onDelete,
}: ExpenseTypePillsProps) {
  const [actionId, setActionId] = useState<string | null>(null);
  const controllerRef = useRef<LongPressController | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

  const canManage = Boolean(onEdit || onDelete) && !disabled;

  // Listener global: gerakan/lepas pointer di luar pill tetap terpantau.
  useEffect(() => {
    const onMove = (e: PointerEvent) =>
      controllerRef.current?.move({ x: e.clientX, y: e.clientY });
    const onUp = () => controllerRef.current?.up();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      controllerRef.current?.cancel();
    };
  }, []);

  // Tap di luar area aksi atau Escape menutup aksi.
  useEffect(() => {
    if (!actionId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && actionRef.current?.contains(target)) return;
      setActionId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionId(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [actionId]);

  useEffect(() => {
    if (actionId) editButtonRef.current?.focus();
  }, [actionId]);

  const openAction = (id: string) => {
    // Pill-nya diganti tombol aksi, jadi klik sisa tidak akan mendarat di pill.
    controllerRef.current?.clearPendingClick();
    setActionId(id);
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    item: ExpenseType,
  ) => {
    if (!canManage) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    controllerRef.current?.cancel();
    const controller = createLongPressController({
      onFire: () => openAction(item.id),
    });
    controllerRef.current = controller;
    controller.start({ x: e.clientX, y: e.clientY });
  };

  const runAction = (fn: (item: ExpenseType) => void, item: ExpenseType) => {
    if (controllerRef.current?.shouldSuppressClick()) return;
    setActionId(null);
    fn(item);
  };

  return (
    <div className={"flex flex-wrap justify-center gap-1.5 " + (className || "")}>
      {items.map((it) => {
        const selected = it.id === value;
        const pillClass =
          "group inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-sm transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50 sm:text-sm " +
          (selected
            ? "-translate-y-0.5 border-white/70 bg-white/70 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-white"
            : "border-white/45 bg-white/35 text-slate-700 hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45 dark:hover:text-slate-50");
        const iconClass =
          "flex h-6 w-6 items-center justify-center rounded-full border leading-none transition-all duration-300 ease-out sm:h-7 sm:w-7 " +
          (selected
            ? "border-slate-200 bg-white/90 text-slate-800 shadow-[0_8px_20px_rgba(148,163,184,0.18)] dark:border-slate-600/80 dark:bg-slate-700/70 dark:text-slate-100"
            : "border-transparent bg-transparent text-current group-hover:border-white/35 group-hover:bg-white/20 dark:group-hover:border-slate-700/70 dark:group-hover:bg-slate-800/35");

        if (actionId === it.id) {
          return (
            <div
              key={it.id}
              ref={actionRef}
              className="inline-flex items-stretch overflow-hidden rounded-xl border border-white/70 bg-white/80 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-800/85 dark:text-slate-100"
            >
              {onEdit && (
                <button
                  ref={editButtonRef}
                  type="button"
                  title={`Ubah ${it.label}`}
                  aria-label={`Ubah ${it.label}`}
                  onClick={() => runAction(onEdit, it)}
                  className="flex min-h-10 w-11 cursor-pointer items-center justify-center transition-colors duration-200 hover:bg-slate-900/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/60 dark:hover:bg-white/10 dark:focus:ring-slate-400/50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  title={`Hapus ${it.label}`}
                  aria-label={`Hapus ${it.label}`}
                  onClick={() => runAction(onDelete, it)}
                  className="flex min-h-10 w-11 cursor-pointer items-center justify-center border-l border-slate-300/60 text-red-600 transition-colors duration-200 hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-400/60 dark:border-slate-600/60 dark:text-red-400 dark:hover:bg-red-500/20 dark:focus:ring-red-400/50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }

        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => {
              if (controllerRef.current?.shouldSuppressClick()) return;
              onChange(it.id);
            }}
            onPointerDown={(e) => handlePointerDown(e, it)}
            onPointerUp={() => controllerRef.current?.up()}
            onContextMenu={(e) => {
              if (!canManage) return;
              e.preventDefault();
              openAction(it.id);
            }}
            className={pillClass + " select-none"}
          >
            <span aria-hidden="true" className={iconClass}>
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
