"use client";

import showToast from "@/lib/client/simple-toast";
import { listIncomeTypes, type IncomeType } from "@/lib/client/income-types";
import { createShoppingNote } from "@/lib/client/notes";
import { AddIncomeTypeDialog } from "@/components/ui/add-income-type-dialog";
import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { ExpenseTypePills } from "@/components/ui/expense-type-pills";
import {
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
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

export function PemasukanForm() {
  const [date, setDate] = useState<string>(() => todayLocalISODate());
  const [amount, setAmount] = useState<string>("");
  const [namaBarang, setNamaBarang] = useState<string>("");
  const [jumlahBarang, setJumlahBarang] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>("");
  const [incomeType, setIncomeType] = useState<string>("");
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [isLoadingIncomeTypes, setIsLoadingIncomeTypes] = useState(false);
  const [incomeTypesError, setIncomeTypesError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIncomeTypesError("");

      setIsLoadingIncomeTypes(true);
      try {
        const items = await listIncomeTypes();
        if (!active) return;
        setIncomeTypes(items);
        setIncomeType((prev) => prev || items[0]?.id || "");
      } catch (e: unknown) {
        if (!active) return;
        const msg =
          e instanceof Error ? e.message : "Gagal mengambil jenis pemasukan";
        setIncomeTypesError(msg);
        try {
          showToast(msg, { type: "error" });
        } catch {}
      } finally {
        if (!active) return;
        setIsLoadingIncomeTypes(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleIncomeTypeCreated = (newType: IncomeType) => {
    setIncomeTypes((prev) =>
      [...prev, newType].sort((a, b) => a.label.localeCompare(b.label)),
    );
    setIncomeType(newType.id);
    setIsAddTypeOpen(false);
  };

  const onSave = async () => {
    const parsedAmount = Number(amount);
    if (!date) return showToast("Tanggal wajib diisi", { type: "error" });
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return showToast("Jumlah harus lebih dari 0", { type: "error" });
    if (!incomeType)
      return showToast("Jenis pemasukan wajib dipilih", { type: "error" });

    setIsSaving(true);
    try {
      await createShoppingNote({
        tanggal: date,
        jumlah: parsedAmount,
        jenis_transaksi: "pemasukan",
        kategori_id: incomeType,
        nama_barang: namaBarang || undefined,
        jumlah_barang: jumlahBarang > 0 ? jumlahBarang : undefined,
        catatan: catatan || undefined,
      });
      setAmount("");
      setNamaBarang("");
      setJumlahBarang(0);
      setCatatan("");
      showToast("Pemasukan tersimpan", { type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan pemasukan";
      showToast(msg, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AddIncomeTypeDialog
        isOpen={isAddTypeOpen}
        onClose={() => setIsAddTypeOpen(false)}
        onCreated={handleIncomeTypeCreated}
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
              Sumber
            </span>
          </div>
          <input
            type="text"
            value={namaBarang}
            onChange={(e) => setNamaBarang(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid gap-3">
          <label className="col-span-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Jumlah
              </span>
            </div>
            <AmountInput
              value={amount}
              onChange={setAmount}
              min={0}
              placeholder=""
            />
          </label>

          {/* <div className="col-span-1 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Qty
            </p>
            <QtyPicker
              value={jumlahBarang}
              onChange={setJumlahBarang}
              disabled={isSaving}
            />
          </div> */}
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
              Jenis pemasukan
            </span>
          </div>
          <ExpenseTypePills
            className="text-center justify-center"
            items={incomeTypes}
            value={incomeType}
            onChange={setIncomeType}
            disabled={isLoadingIncomeTypes}
            onAdd={() => setIsAddTypeOpen(true)}
          />

          {incomeTypesError ? (
            <p className="text-xs text-red-600 font-medium">
              {incomeTypesError}
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
