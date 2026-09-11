"use client";

import showToast from "@/lib/client/simple-toast";
import {
  listExpenseTypes,
  type ExpenseType,
} from "@/lib/client/expense-types";
import { createShoppingNote } from "@/lib/client/notes";
import { AddExpenseTypeDialog } from "@/components/ui/add-expense-type-dialog";
import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { ExpenseTypePills } from "@/components/ui/expense-type-pills";
import { QtyPicker } from "@/components/ui/qty-picker";
import {
  ReceiptScanner,
  type WizardSavePayload,
} from "@/components/ui/receipt-scanner";
import { VoiceNote } from "@/components/ui/voice-note";
import {
  Calendar,
  CameraIcon,
  CheckCircle,
  DollarSign,
  FileText,
  Mic,
  Package,
  Save,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";

function todayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-base text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25";

export function PengeluaranForm() {
  const [date, setDate] = useState<string>(() => todayLocalISODate());
  const [amount, setAmount] = useState<string>("");
  const [namaBarang, setNamaBarang] = useState<string>("");
  const [jumlahBarang, setJumlahBarang] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("");
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoadingExpenseTypes, setIsLoadingExpenseTypes] = useState(false);
  const [expenseTypesError, setExpenseTypesError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setExpenseTypesError("");

      setIsLoadingExpenseTypes(true);
      try {
        const items = await listExpenseTypes();
        if (!active) return;
        setExpenseTypes(items);
        setExpenseType((prev) => prev || items[0]?.id || "");
      } catch (e: unknown) {
        if (!active) return;
        const msg =
          e instanceof Error ? e.message : "Gagal mengambil jenis pengeluaran";
        setExpenseTypesError(msg);
        try {
          showToast(msg, { type: "error" });
        } catch {}
      } finally {
        if (!active) return;
        setIsLoadingExpenseTypes(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleExpenseTypeCreated = (newType: ExpenseType) => {
    setExpenseTypes((prev) =>
      [...prev, newType].sort((a, b) => a.label.localeCompare(b.label)),
    );
    setExpenseType(newType.id);
    setIsAddTypeOpen(false);
  };

  const handleSaveScannedItem = async (item: WizardSavePayload) => {
    await createShoppingNote({
      tanggal: item.tanggal,
      jumlah: item.jumlah,
      jenis_transaksi: "pengeluaran",
      kategori_id: item.kategori_id,
      nama_barang: item.nama_barang || undefined,
      jumlah_barang: item.jumlah_barang > 0 ? item.jumlah_barang : undefined,
      catatan: item.catatan || undefined,
    });
  };

  const onSave = async () => {
    const parsedAmount = Number(amount);
    if (!date) return showToast("Tanggal wajib diisi", { type: "error" });
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return showToast("Jumlah harus lebih dari 0", { type: "error" });
    if (!expenseType)
      return showToast("Tipe pengeluaran wajib dipilih", { type: "error" });

    setIsSaving(true);
    try {
      await createShoppingNote({
        tanggal: date,
        jumlah: parsedAmount,
        jenis_transaksi: "pengeluaran",
        kategori_id: expenseType,
        nama_barang: namaBarang || undefined,
        jumlah_barang: jumlahBarang > 0 ? jumlahBarang : undefined,
        catatan: catatan || undefined,
      });
      setAmount("");
      setNamaBarang("");
      setJumlahBarang(0);
      setCatatan("");
      showToast("Catatan tersimpan", { type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan catatan";
      showToast(msg, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsScannerOpen(true)}
        aria-label="Scan struk belanja"
        title="Scan struk"
        className="fixed left-2 top-2 z-60 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:left-10 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
      >
        <CameraIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setIsVoiceOpen(true)}
        aria-label="Voice note"
        title="Voice note"
        className="fixed left-12 top-2 z-60 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:left-20 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
      >
        <Mic className="h-4 w-4" />
      </button>

      <ReceiptScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        expenseTypes={expenseTypes}
        onSaveItem={handleSaveScannedItem}
      />

      <VoiceNote
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        expenseTypes={expenseTypes}
        onSaveItem={handleSaveScannedItem}
      />

      <AddExpenseTypeDialog
        isOpen={isAddTypeOpen}
        onClose={() => setIsAddTypeOpen(false)}
        onCreated={handleExpenseTypeCreated}
      />

      <div className="grid grid-cols-1 gap-4">
        <label className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-slate-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Tanggal
            </span>
          </div>
          <AppleDatePicker value={date} onChange={setDate} />
        </label>

        <label className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500 dark:text-slate-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Nama barang
            </span>
          </div>
          <input
            type="text"
            value={namaBarang}
            onChange={(e) => setNamaBarang(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-5 gap-3">
          <label className="col-span-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Jumlah Harga
              </span>
            </div>
            <AmountInput
              value={amount}
              onChange={setAmount}
              min={0}
              placeholder=""
            />
          </label>

          <div className="col-span-1 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Qty
            </p>
            <QtyPicker
              value={jumlahBarang}
              onChange={setJumlahBarang}
              disabled={isSaving}
            />
          </div>
        </div>

        <label className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500 dark:text-slate-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Catatan
            </span>
          </div>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
          />
        </label>

        <label className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-gray-500 dark:text-slate-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Tipe pengeluaran
            </span>
          </div>
          <ExpenseTypePills
            className="text-center justify-center"
            items={expenseTypes}
            value={expenseType}
            onChange={setExpenseType}
            disabled={isLoadingExpenseTypes}
            onAdd={() => setIsAddTypeOpen(true)}
          />

          {expenseTypesError ? (
            <p className="text-xs text-red-600 font-medium">
              {expenseTypesError}
            </p>
          ) : null}
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/70 bg-white/75 px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-slate-300/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(15,23,42,0.45)] dark:hover:bg-slate-700/85 dark:focus:ring-slate-500/50"
        >
          {isSaving ? (
            <>
              <Save className="w-4 h-4 animate-pulse" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Simpan
            </>
          )}
        </button>
      </div>
    </>
  );
}
