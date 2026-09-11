"use client";

import { apiFetch, getErrorMessage } from "@/lib/client/api";
import showToast from "@/lib/client/simple-toast";
import { type ExpenseType } from "@/lib/client/expense-types";
import { AmountInput } from "@/components/ui/amount-input";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { ExpenseTypePills } from "@/components/ui/expense-type-pills";
import { QtyPicker } from "@/components/ui/qty-picker";
import { type WizardSavePayload } from "@/components/ui/receipt-scanner";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Mic,
  MicOff,
  Save,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ScannedItem = {
  nama_barang: string;
  jumlah: number;
  total_harga: number;
};

type WizardItem = {
  nama_barang: string;
  jumlah_barang: number;
  jumlah: string;
  catatan: string;
};

type Step = "record" | "processing" | "wizard";

export type VoiceNoteProps = {
  isOpen: boolean;
  onClose: () => void;
  expenseTypes: ExpenseType[];
  onSaveItem: (item: WizardSavePayload) => Promise<void>;
};

// ─── browser Speech API types ─────────────────────────────────────────────────

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionCtor: any =
  typeof window !== "undefined"
    ? // @ts-expect-error vendor prefix
      (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : undefined;

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

async function callVoiceNote(transcript: string): Promise<ScannedItem[]> {
  const res = await apiFetch("/voice-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) {
    const msg = await getErrorMessage(
      res,
      `Gagal memproses suara (${res.status})`,
    );
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

export function VoiceNote({
  isOpen,
  onClose,
  expenseTypes,
  onSaveItem,
}: VoiceNoteProps) {
  const [step, setStep] = useState<Step>("record");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordError, setRecordError] = useState("");

  const [wizardItems, setWizardItems] = useState<WizardItem[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [wizardDate, setWizardDate] = useState("");
  const [wizardKategori, setWizardKategori] = useState("");
  const [isSavingWizard, setIsSavingWizard] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const recognitionRef = useRef<unknown>(null);

  // reset on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setStep("record");
      setIsListening(false);
      setTranscript("");
      setRecordError("");
      setWizardItems([]);
      setWizardIndex(0);
      setWizardError("");
      setSavedCount(0);
    }
  }, [isOpen]);

  function stopListening() {
    if (recognitionRef.current) {
      // @ts-expect-error dynamic
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  const handleStartRecording = () => {
    if (!SpeechRecognitionCtor) {
      setRecordError(
        "Browser kamu tidak mendukung fitur voice. Coba pakai Chrome.",
      );
      return;
    }
    setTranscript("");
    setRecordError("");
    setIsListening(true);

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
          break;
        } else {
          interim = result[0].transcript;
        }
      }
      setTranscript((finalText + interim).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      setRecordError(`Gagal merekam: ${event.error}`);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const handleStopRecording = () => {
    stopListening();
    setIsListening(false);
  };

  const handleProcess = async () => {
    const text = transcript.trim();
    if (!text) {
      setRecordError("Belum ada transkrip suara. Coba rekam dulu.");
      return;
    }
    setRecordError("");
    setStep("processing");
    try {
      const items = await callVoiceNote(text);
      if (items.length === 0) {
        setRecordError(
          "Tidak ada item terdeteksi dari suara kamu. Coba lagi dengan lebih jelas.",
        );
        setStep("record");
        return;
      }
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
      setRecordError(e instanceof Error ? e.message : "Gagal memproses suara");
      setStep("record");
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
      className={`fixed inset-0 z-50 flex justify-center bg-slate-950/45 px-3 backdrop-blur-sm ${step === "wizard" ? "items-start pt-5" : "items-center"}`}
    >
      <div
        className="absolute inset-0"
        onClick={step !== "wizard" ? onClose : undefined}
      />

      <section
        className={`relative z-10 max-h-[90vh] w-full max-w-lg rounded-3xl border border-white/45 bg-white/35 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/40 sm:p-5 overflow-y-auto`}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Voice Note
            </h2>
          </div>

          <div className="flex items-center gap-2">
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

        {/* ── Step: Record ── */}
        {step === "record" && (
          <div className="flex flex-col items-center gap-5 py-6">
            {/* Mic button with pulse animation when listening */}
            <button
              type="button"
              onClick={isListening ? handleStopRecording : handleStartRecording}
              className={[
                "relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300",
                isListening
                  ? "border-red-400 bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400"
                  : "border-cyan-400/70 bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50",
              ].join(" ")}
              aria-label={isListening ? "Stop recording" : "Start recording"}
            >
              {isListening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />
              )}
              {isListening ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>

            <p className="text-sm text-gray-600 dark:text-slate-300">
              {isListening
                ? "Mendengarkan... ketuk untuk berhenti"
                : "Ketuk mikrofon lalu ucapkan pengeluaranmu"}
            </p>

            {/* Live transcript */}
            {(transcript || isListening) && (
              <div className="w-full rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-300 min-h-[60px]">
                {transcript || (
                  <span className="italic text-slate-400 dark:text-slate-500">
                    Menunggu suara...
                  </span>
                )}
              </div>
            )}

            {/* Manual transcript edit */}
            {!isListening && transcript && (
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Edit transkrip jika perlu:
                </p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={3}
                  className={inputClass + " resize-none"}
                />
              </div>
            )}

            {recordError && (
              <p className="w-full text-center text-xs font-medium text-red-600 dark:text-red-400">
                {recordError}
              </p>
            )}

            {!isListening && transcript && (
              <button
                type="button"
                onClick={handleProcess}
                className={btnPrimaryClass + " w-full max-w-xs"}
              >
                <Mic className="h-4 w-4" />
                Proses suara
              </button>
            )}
          </div>
        )}

        {/* ── Step: Processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <LoaderCircle className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-300" />
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Sedang memproses suara kamu...
            </p>
          </div>
        )}

        {/* ── Step: Wizard ── */}
        {step === "wizard" && currentItem && (
          <div className="flex flex-col gap-3">
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

            {wizardError && (
              <p className="text-xs font-medium text-red-600">{wizardError}</p>
            )}

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
