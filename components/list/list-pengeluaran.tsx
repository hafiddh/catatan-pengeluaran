"use client";

import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import {
  ExpenseTypePills,
  getExpenseTypeIcon,
} from "@/components/ui/expense-type-pills";
import { QtyPicker } from "@/components/ui/qty-picker";
import showToast from "@/lib/client/simple-toast";
import { OwnerBadge } from "@/components/ui/owner-badge";
import { useAuth } from "@/lib/client/auth-context";
import {
  listExpenseTypes,
  type ExpenseType,
} from "@/lib/client/expense-types";
import {
  deleteShoppingNote,
  listShoppingNotes,
  updateShoppingNote,
  type ShoppingNote,
} from "@/lib/client/notes";
import {
  CalendarRange,
  FileText,
  LoaderCircle,
  Package,
  Pencil,
  Save,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 20;

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
    month: "long",
    year: "numeric",
  }).format(value);
}

type Props = {
  startDate: string;
  endDate: string;
};

export function ListPengeluaranView({ startDate, endDate }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ShoppingNote[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingNote, setEditingNote] = useState<ShoppingNote | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editExpenseType, setEditExpenseType] = useState<string>("");
  const [editNamaBarang, setEditNamaBarang] = useState<string>("");
  const [editJumlahBarang, setEditJumlahBarang] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [pendingDeleteNote, setPendingDeleteNote] =
    useState<ShoppingNote | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "300px" },
    );
    observerRef.current.observe(node);
  }, []);

  const expenseTypeMap = useMemo(
    () => new Map(expenseTypes.map((item) => [item.id, item])),
    [expenseTypes],
  );

  const fetchExpenseTypes = useCallback(async () => {
    try {
      setExpenseTypes(await listExpenseTypes());
    } catch {
      // non-critical
    }
  }, []);

  const fetchNotes = useCallback(
    async (page: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError("");
      }
      try {
        const result = await listShoppingNotes({
          startDate,
          endDate,
          jenisTransaksi: "pengeluaran",
          page,
          limit: PAGE_SIZE,
        });
        if (append) {
          setNotes((prev) => [...prev, ...result.data]);
        } else {
          setNotes(result.data);
        }
        setHasNext(result.has_next);
        setCurrentPage(page);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Gagal mengambil data catatan";
        if (!append) setError(message);
        showToast(message, { type: "error" });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [startDate, endDate],
  );

  useEffect(() => {
    setNotes([]);
    setCurrentPage(1);
    setHasNext(false);
    fetchNotes(1, false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchExpenseTypes();
  }, [fetchExpenseTypes]);

  const loadMoreRef = useRef((): void => {});
  loadMoreRef.current = () => {
    if (hasNext && !isLoadingMore && !isLoading) {
      fetchNotes(currentPage + 1, true);
    }
  };

  const openEditModal = (note: ShoppingNote) => {
    setEditingNote(note);
    setEditDate(note.tanggal);
    setEditAmount(String(note.jumlah));
    setEditExpenseType(note.kategori_id);
    setEditNamaBarang(note.nama_barang ?? "");
    setEditJumlahBarang(note.jumlah_barang ?? 0);
    setEditCatatan(note.catatan ?? "");
  };

  const closeEditModal = (force = false) => {
    if (isSubmittingEdit && !force) return;
    setEditingNote(null);
    setEditDate("");
    setEditAmount("");
    setEditExpenseType("");
    setEditNamaBarang("");
    setEditJumlahBarang(0);
    setEditCatatan("");
  };

  const handleUpdate = async () => {
    if (!editingNote) return;
    const parsedAmount = Number(editAmount);
    if (!editDate) {
      showToast("Tanggal wajib diisi", { type: "error" });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast("Jumlah harus lebih dari 0", { type: "error" });
      return;
    }
    if (!editExpenseType) {
      showToast("Tipe pengeluaran wajib dipilih", { type: "error" });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      const updatedNote = await updateShoppingNote(editingNote.id, {
        tanggal: editDate,
        jumlah: parsedAmount,
        jenis_transaksi: "pengeluaran",
        kategori_id: editExpenseType,
        nama_barang: editNamaBarang || undefined,
        jumlah_barang: editJumlahBarang > 0 ? editJumlahBarang : undefined,
        catatan: editCatatan || undefined,
      });
      setNotes((current) =>
        current.map((note) =>
          note.id === updatedNote.id ? updatedNote : note,
        ),
      );
      closeEditModal(true);
      showToast("Catatan berhasil diubah", { type: "success" });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal mengubah catatan", {
        type: "error",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDelete = (note: ShoppingNote) => {
    if (deletingId) return;
    setPendingDeleteNote(note);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setPendingDeleteNote(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteNote) return;
    setDeletingId(pendingDeleteNote.id);
    try {
      await deleteShoppingNote(pendingDeleteNote.id);
      setNotes((current) =>
        current.filter((item) => item.id !== pendingDeleteNote.id),
      );
      if (editingNote?.id === pendingDeleteNote.id) closeEditModal();
      setPendingDeleteNote(null);
      showToast("Catatan berhasil dihapus", { type: "success" });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menghapus catatan", {
        type: "error",
      });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-white/45 bg-white/35 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25">
        <div className="border-b border-white/40 px-5 py-4 dark:border-slate-700/70 sm:px-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Data Pengeluaran
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500 dark:text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data catatan...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        ) : notes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-300">
            Belum ada data pada rentang tanggal yang dipilih.
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
              {notes.map((note) => {
                const categoryLabel = note.kategori_label || "Tanpa kategori";
                const categoryIcon = note.kategori_icon;
                const isMine = note.user_id === user?.id;
                return (
                  <div key={note.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                          {formatDate(note.tanggal)}
                        </p>
                        <OwnerBadge userId={note.user_id} />
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                        {getExpenseTypeIcon(
                          categoryIcon,
                          categoryLabel,
                        )}
                        <span>{categoryLabel}</span>
                      </div>
                    </div>

                    {(note.nama_barang || note.jumlah_barang || note.catatan) && (
                      <div className="mt-2 space-y-1.5 rounded-2xl border border-white/40 bg-white/20 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-800/20">
                        {(note.nama_barang || note.jumlah_barang) && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Package className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                              <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-200">
                                {note.nama_barang || "—"}
                              </span>
                            </div>
                            {!!note.jumlah_barang && (
                              <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-slate-600/50 dark:bg-slate-700/40 dark:text-slate-300">
                                <Package className="h-3 w-3" />
                                {note.jumlah_barang}
                              </div>
                            )}
                          </div>
                        )}
                        {note.catatan && (
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                            <span className="text-xs italic text-gray-400 dark:text-slate-500">
                              {note.catatan}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xl font-bold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                        {formatCurrency(note.jumlah)}
                      </p>
                      {isMine && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(note)}
                            title="Edit"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            disabled={deletingId === note.id}
                            title="Hapus"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-red-200/70 bg-red-50/75 text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-red-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/80 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-900/35"
                          >
                            {deletingId === note.id ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600 dark:bg-slate-800/60 dark:text-slate-200">
                    <th className="px-5 py-4 font-semibold sm:px-6">No</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Tanggal</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Oleh</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Kategori</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Detail</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Jumlah</th>
                    <th className="px-5 py-4 font-semibold sm:px-6">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note, index) => {
                    const categoryLabel = note.kategori_label || "Tanpa kategori";
                    const categoryIcon = note.kategori_icon;
                    const isMine = note.user_id === user?.id;
                    return (
                      <tr
                        key={note.id}
                        className="border-t border-gray-100 dark:border-slate-800"
                      >
                        <td className="px-5 py-4 align-top text-gray-500 dark:text-slate-300 sm:px-6">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4 align-top text-gray-900 dark:text-slate-100 sm:px-6">
                          {formatDate(note.tanggal)}
                        </td>
                        <td className="px-5 py-4 align-top sm:px-6">
                          <OwnerBadge userId={note.user_id} />
                        </td>
                        <td className="px-5 py-4 align-top sm:px-6">
                          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                            {getExpenseTypeIcon(
                              categoryIcon,
                              categoryLabel,
                            )}
                            {categoryLabel}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top sm:px-6">
                          {note.nama_barang ? (
                            <div>
                              <p className="text-sm text-gray-900 dark:text-slate-100">
                                {note.jumlah_barang
                                  ? `${note.jumlah_barang}x `
                                  : ""}
                                {note.nama_barang}
                              </p>
                              {note.catatan && (
                                <p className="mt-0.5 text-xs italic text-gray-400 dark:text-slate-500">
                                  {note.catatan}
                                </p>
                              )}
                            </div>
                          ) : note.catatan ? (
                            <p className="text-xs italic text-gray-400 dark:text-slate-500">
                              {note.catatan}
                            </p>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100 sm:px-6">
                          {formatCurrency(note.jumlah)}
                        </td>
                        <td className="px-5 py-4 align-top sm:px-6">
                          {isMine && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(note)}
                                title="Edit"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(note)}
                                disabled={deletingId === note.id}
                                title="Hapus"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-red-200/70 bg-red-50/75 text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-red-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/80 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-900/35"
                              >
                                {deletingId === note.id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div ref={sentinelRef} className="h-1" />
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-gray-500 dark:text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Memuat lebih...
              </div>
            )}
            {!hasNext && notes.length > 0 && (
              <div className="border-t border-white/40 px-5 py-4 text-center text-sm text-gray-500 dark:border-slate-700/70 dark:text-slate-300 sm:px-6">
                {notes.length} data ditampilkan
              </div>
            )}
          </>
        )}
      </section>

      {editingNote ? (
        <div className="-mt-10 fixed inset-0 z-80 flex items-center justify-center bg-slate-950/45 px-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => closeEditModal()} />
          <section className="relative z-10 mb-10 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/45 bg-white/35 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/40 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Tanggal
                  </span>
                </div>
                <AppleDatePicker value={editDate} onChange={setEditDate} />
              </label>

              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Jumlah
                  </span>
                </div>
                <AmountInput value={editAmount} onChange={setEditAmount} min={0} />
              </label>

              <div className="grid grid-cols-5 gap-3">
                <label className="col-span-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Nama barang
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editNamaBarang}
                    onChange={(e) => setEditNamaBarang(e.target.value)}
                    placeholder="opsional"
                    disabled={isSubmittingEdit}
                    className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50"
                  />
                </label>
                <div className="col-span-1 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Qty
                  </p>
                  <QtyPicker
                    value={editJumlahBarang}
                    onChange={setEditJumlahBarang}
                    disabled={isSubmittingEdit}
                  />
                </div>
              </div>

              <label className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Catatan
                  </span>
                </div>
                <textarea
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="opsional"
                  rows={2}
                  disabled={isSubmittingEdit}
                  className="w-full resize-none rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50"
                />
              </label>

              <label className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Tipe pengeluaran
                  </span>
                </div>
                <ExpenseTypePills
                  items={expenseTypes}
                  value={editExpenseType}
                  onChange={setEditExpenseType}
                  disabled={isSubmittingEdit}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeEditModal()}
                disabled={isSubmittingEdit}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isSubmittingEdit}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(15,23,42,0.45)] dark:hover:bg-slate-700/85"
              >
                {isSubmittingEdit ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan perubahan
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingDeleteNote ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/45 px-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeDeleteModal} />
          <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/45 bg-white/35 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/40 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Hapus catatan?
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                  Catatan{" "}
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {expenseTypeMap.get(pendingDeleteNote.kategori_id)?.label ||
                      "tanpa kategori"}
                  </span>{" "}
                  pada tanggal{" "}
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {formatDate(pendingDeleteNote.tanggal)}
                  </span>{" "}
                  akan dihapus permanen dari daftar.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-200/70 bg-red-50/75 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-red-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/80 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-900/35"
              >
                {deletingId ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Ya, hapus
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
