"use client";

import { apiFetch, getErrorMessage } from "@/lib/client/api";
import showToast from "@/lib/client/simple-toast";
import { type ExpenseType } from "@/lib/client/expense-types";
import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { ExpenseTypePills } from "@/components/ui/expense-type-pills";
import { QtyPicker } from "@/components/ui/qty-picker";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Crop,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

// Raw item from Gemini
type ScannedItem = {
  nama_barang: string;
  jumlah: number;
  total_harga: number;
};

// Per-item editable state in wizard
type WizardItem = {
  nama_barang: string;
  jumlah_barang: number;
  jumlah: string; // controlled string for AmountInput
  catatan: string;
};

// Data passed to onSaveItem callback
export type WizardSavePayload = {
  tanggal: string;
  nama_barang: string;
  jumlah_barang: number;
  jumlah: number;
  kategori_id: string;
  catatan?: string;
};

type Step = "upload" | "crop" | "scanning" | "wizard";
type Rect = { x: number; y: number; w: number; h: number };

export type ReceiptScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  onSaveItem: (item: WizardSavePayload) => Promise<void>;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

async function cropAndCompress(
  img: HTMLImageElement,
  crop: Rect,
  displayW: number,
  displayH: number,
  maxBytes = 500 * 1024,
): Promise<string> {
  const sx = (crop.x / displayW) * img.naturalWidth;
  const sy = (crop.y / displayH) * img.naturalHeight;
  const sw = (crop.w / displayW) * img.naturalWidth;
  const sh = (crop.h / displayH) * img.naturalHeight;

  return new Promise((resolve, reject) => {
    const attempt = (w: number, h: number, q: number) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      c.getContext("2d")!.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        c.width,
        c.height,
      );
      c.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Kompres gagal"));
            return;
          }
          if (blob.size <= maxBytes || q <= 0.15) {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          } else {
            const scale = blob.size > maxBytes * 2 ? 0.8 : 1;
            attempt(w * scale, h * scale, q - 0.15);
          }
        },
        "image/jpeg",
        q,
      );
    };
    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    attempt(sw * scale, sh * scale, 0.92);
  });
}

async function callScanReceipt(base64: string): Promise<ScannedItem[]> {
  const res = await apiFetch("/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: base64, mime_type: "image/jpeg" }),
  });
  if (!res.ok) {
    const msg = await getErrorMessage(res, `Gagal scan struk (${res.status})`);
    throw new Error(msg);
  }
  const items = (await res.json()) as ScannedItem[];
  if (!Array.isArray(items)) throw new Error("Format respons tidak valid");
  return items;
}

// ─── style constants ──────────────────────────────────────────────────────────

const btnClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/45 bg-white/35 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45";
const btnPrimaryClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700/85 dark:disabled:opacity-60";
const inputClass =
  "w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50";
const navBtnClass =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl border border-white/45 bg-white/35 text-slate-600 transition-all duration-200 hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-300 dark:hover:bg-slate-800/45";

// ─── component ────────────────────────────────────────────────────────────────

export function ReceiptScanner({
  isOpen,
  onClose,
  expenseTypes,
  onSaveItem,
}: ReceiptScannerProps) {
  // ── scan state ──
  const [step, setStep] = useState<Step>("upload");
  const [scanError, setScanError] = useState("");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // ── refs ──
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── wizard state ──
  const [wizardItems, setWizardItems] = useState<WizardItem[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [wizardDate, setWizardDate] = useState("");
  const [wizardKategori, setWizardKategori] = useState("");
  const [isSavingWizard, setIsSavingWizard] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  // ── reset on close ──
  useEffect(() => {
    if (!isOpen) {
      setStep("upload");
      setScanError("");
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(undefined);
      setCroppedAreaPixels(null);
      setWizardItems([]);
      setWizardIndex(0);
      setWizardError("");
      setSavedCount(0);
    }
  }, [isOpen]);

  // ── file select ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("File harus berupa gambar", { type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(undefined);
      setCroppedAreaPixels(null);
      setScanError("");
      setStep("crop");
    };
    reader.onerror = () => {
      showToast("Gagal memuat gambar", { type: "error" });
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.src = url;
    });

  // ── scan ──
  const handleScan = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setScanError("");
    setStep("scanning");
    try {
      const img = await loadImageFromUrl(imageSrc);
      const rect: Rect = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        w: croppedAreaPixels.width,
        h: croppedAreaPixels.height,
      };
      const base64 = await cropAndCompress(
        img,
        rect,
        img.naturalWidth,
        img.naturalHeight,
      );
      const items = await callScanReceipt(base64);
      if (items.length === 0) {
        setScanError(
          "Tidak ada item terdeteksi. Coba crop area struk lebih tepat.",
        );
        setStep("crop");
        return;
      }
      // Init wizard
      setWizardItems(
        items.map((item) => ({
          nama_barang: item.nama_barang,
          jumlah_barang: item.jumlah,
          jumlah: String(item.total_harga),
          catatan: "",
        })),
      );
      setWizardIndex(0);
      setWizardDate(todayISODate());
      setWizardKategori(expenseTypes[0]?.id ?? "");
      setSavedCount(0);
      setWizardError("");
      setStep("wizard");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Gagal scan struk");
      setStep("crop");
    }
  };

  // ── wizard helpers ──
  const currentItem = wizardItems[wizardIndex];

  const updateItem = <K extends keyof WizardItem>(
    field: K,
    value: WizardItem[K],
  ) => {
    setWizardItems((prev) =>
      prev.map((item, i) =>
        i === wizardIndex ? { ...item, [field]: value } : item,
      ),
    );
  };

  const goToItem = (index: number) => {
    if (index < 0 || index >= wizardItems.length) return;
    setWizardIndex(index);
    setWizardError("");
  };

  const handleWizardSave = async () => {
    const parsed = Number(currentItem.jumlah);
    if (!wizardDate) {
      setWizardError("Tanggal wajib diisi");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWizardError("Jumlah harus lebih dari 0");
      return;
    }
    if (!wizardKategori) {
      setWizardError("Kategori wajib dipilih");
      return;
    }

    setIsSavingWizard(true);
    setWizardError("");
    try {
      await onSaveItem({
        tanggal: wizardDate,
        nama_barang: currentItem.nama_barang,
        jumlah_barang: currentItem.jumlah_barang,
        jumlah: parsed,
        kategori_id: wizardKategori,
        catatan: currentItem.catatan || undefined,
      });
      const next = savedCount + 1;
      setSavedCount(next);
      if (wizardIndex >= wizardItems.length - 1) {
        showToast(`${next} catatan berhasil disimpan`, { type: "success" });
        onClose();
      } else {
        setWizardIndex((prev) => prev + 1);
        setWizardError("");
      }
    } catch (e: unknown) {
      setWizardError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setIsSavingWizard(false);
    }
  };

  const handleWizardSkip = () => {
    setWizardError("");
    if (wizardIndex >= wizardItems.length - 1) {
      if (savedCount > 0)
        showToast(`${savedCount} catatan berhasil disimpan`, {
          type: "success",
        });
      onClose();
    } else {
      setWizardIndex((prev) => prev + 1);
    }
  };

  if (!isOpen) return null;

  const isLastItem = wizardIndex >= wizardItems.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-slate-950/45 px-3 backdrop-blur-sm ${step === "wizard" || step === "crop" ? "items-start pt-4 pb-28" : "items-center pb-24"}`}
    >
      <div
        className="absolute inset-0"
        onClick={step !== "wizard" ? onClose : undefined}
      />

      <section
        className="relative z-10 max-h-[calc(100dvh-8rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/45 bg-white/35 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/40 sm:p-5"
      >
        {/* ── Header ── */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Scan Struk
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Wizard nav — only shown in wizard step */}
            {step === "wizard" && wizardItems.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToItem(wizardIndex - 1)}
                  disabled={wizardIndex === 0 || isSavingWizard}
                  className={navBtnClass}
                  aria-label="Item sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {wizardIndex + 1} / {wizardItems.length}
                </span>
                <button
                  type="button"
                  onClick={() => goToItem(wizardIndex + 1)}
                  disabled={isLastItem || isSavingWizard}
                  className={navBtnClass}
                  aria-label="Item berikutnya"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-700 transition-all duration-300 ease-out hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:bg-slate-800/45"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full border border-white/45 bg-white/35 p-4 dark:border-slate-700/70 dark:bg-slate-900/35">
              <ReceiptText className="h-8 w-8 text-cyan-600 dark:text-cyan-300" />
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-slate-300">
              Pilih atau ambil foto struk belanja kamu. Pastikan seluruh struk
              terlihat jelas untuk hasil terbaik.
            </p>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!fileInputRef.current) return;
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }}
                className={btnClass + " w-full"}
              >
                <Upload className="h-4 w-4" />
                Pilih dari galeri
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!fileInputRef.current) return;
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }}
                className={btnClass + " w-full"}
              >
                <Camera className="h-4 w-4" />
                Ambil foto
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* ── Step: Crop ── */}
        {step === "crop" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Cubit untuk zoom, geser untuk memindahkan. Pilih bentuk area di
              bawah, lalu posisikan struk di dalam kotak.
            </p>

            {/* Aspect ratio picker */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { label: "Bebas", value: undefined },
                  { label: "Strip", value: 5 / 2 },
                  { label: "Lebar", value: 16 / 9 },
                  { label: "1:1", value: 1 },
                  { label: "Tinggi", value: 3 / 4 },
                ] as const
              ).map((opt) => {
                const active = aspect === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setAspect(opt.value);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                      active
                        ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-700 dark:text-cyan-200"
                        : "border-white/45 bg-white/35 text-slate-700 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-300 dark:hover:bg-slate-800/45",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div
              className="relative mx-auto w-full overflow-hidden rounded-xl border border-white/40 bg-black/40 dark:border-slate-700/50"
              style={{ height: "42vh" }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                minZoom={0.5}
                maxZoom={5}
                restrictPosition={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={true}
                objectFit="contain"
              />
            </div>
            {scanError && (
              <p className="text-xs font-medium text-red-600">{scanError}</p>
            )}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setImageSrc("");
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setAspect(undefined);
                  setCroppedAreaPixels(null);
                  setScanError("");
                }}
                className={btnClass}
              >
                <RotateCcw className="h-4 w-4" />
                Ganti foto
              </button>
              <button
                type="button"
                onClick={handleScan}
                className={btnPrimaryClass}
              >
                <Crop className="h-4 w-4" />
                Scan struk
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Scanning ── */}
        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <LoaderCircle className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-300" />
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Sedang membaca struk...
            </p>
          </div>
        )}

        {/* ── Step: Wizard ── */}
        {step === "wizard" && currentItem && (
          <div className="flex flex-col gap-3">
            {/* Progress dots */}
            {wizardItems.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {wizardItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isSavingWizard && goToItem(i)}
                    className={[
                      "h-1.5 rounded-full transition-all duration-200",
                      i === wizardIndex
                        ? "w-6 bg-cyan-500 dark:bg-cyan-400"
                        : "w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500",
                    ].join(" ")}
                    aria-label={`Ke item ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Date — shared across all items */}
            <label className="space-y-3">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Tanggal
              </span>
              <AppleDatePicker
                value={wizardDate}
                onChange={setWizardDate}
                className="mt-1"
              />
            </label>

            {/* Nama barang */}
            <label className="space-y-3">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Nama barang
              </span>
              <input
                type="text"
                value={currentItem.nama_barang}
                onChange={(e) => updateItem("nama_barang", e.target.value)}
                disabled={isSavingWizard}
                className={inputClass + " mt-1"}
              />
            </label>

            {/* Qty + Amount */}
            <div className="grid grid-cols-5 gap-3">
              <label className="col-span-4 space-y-3">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Jumlah harga
                </span>
                <AmountInput
                  className="mt-1"
                  value={currentItem.jumlah}
                  onChange={(v) => updateItem("jumlah", v)}
                  min={0}
                  disabled={isSavingWizard}
                />
              </label>
              <div className="col-span-1 space-y-3">
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Qty
                </p>
                <QtyPicker
                  value={currentItem.jumlah_barang}
                  onChange={(v) => updateItem("jumlah_barang", v)}
                  disabled={isSavingWizard}
                />
              </div>
            </div>

            {/* Catatan */}
            <label className="space-y-3">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Catatan (opsional)
              </span>
              <textarea
                value={currentItem.catatan}
                onChange={(e) => updateItem("catatan", e.target.value)}
                rows={2}
                disabled={isSavingWizard}
                className={inputClass + " resize-none mt-2"}
              />
            </label>

            {/* Kategori */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Kategori
              </span>
              <ExpenseTypePills
                className="mt-2"
                items={expenseTypes}
                value={wizardKategori}
                onChange={setWizardKategori}
                disabled={isSavingWizard}
              />
            </div>

            {/* Error */}
            {wizardError && (
              <p className="text-xs font-medium text-red-600">{wizardError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={handleWizardSkip}
                disabled={isSavingWizard}
                className={btnClass + " text-xs"}
              >
                {isLastItem ? "Selesai" : "Lewati"}
              </button>

              <button
                type="button"
                onClick={handleWizardSave}
                disabled={isSavingWizard}
                className={btnPrimaryClass}
              >
                {isSavingWizard ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isLastItem ? "Simpan & Selesai" : "Simpan & Lanjut"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
