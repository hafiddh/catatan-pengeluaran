"use client";

import { CategoryNotesModal } from "@/components/ui/category-notes-modal";
import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills";
import { useAuth } from "@/lib/client/auth-context";
import showToast from "@/lib/client/simple-toast";
import {
  analyzeExpenses,
  getShoppingNotesSummary,
  type AnalyzePeriod,
  type NotesSummary,
  type NotesSummaryItem,
} from "@/lib/client/notes";
import {
  DiamondIcon,
  LoaderCircle,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

function formatDate(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPrevMonthRange(startDate: string): { start: string; end: string } {
  const d = new Date(`${startDate}T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth();
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 12 : month;
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${prevYear}-${pad(prevMonth)}-01`,
    end: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function formatYearMonth(yearMonth: string): string {
  const d = new Date(`${yearMonth}-01T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(d);
}

const PERSONA_OPTIONS = [
  {
    value: "bestie",
    label: "Bestie Satir",
    description: "Sahabat yang peduli, hangat, dengan sentuhan satir.",
  },
  {
    value: "mentor",
    label: "Mentor Tegas",
    description: "Lugas, langsung pada poin, tanpa basa-basi.",
  },
  {
    value: "cheerleader",
    label: "Selalu Positif",
    description: "Antusias, optimis, dan selalu cari sisi baik.",
  },
  {
    value: "paranoid",
    label: "Selalu Waspada",
    description: "Hati-hati, fokus pada risiko dan potensi masalah.",
  },
  {
    value: "galak",
    label: "Galak",
    description: "Judes, sinis, suka ngegas — tapi sayangnya jujur.",
  },
] as const;

type PersonaValue = (typeof PERSONA_OPTIONS)[number]["value"];

type Props = {
  startDate: string;
  endDate: string;
};

export function LaporanPemasukanView({
  startDate,
  endDate,
}: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<NotesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<NotesSummaryItem | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [typedResult, setTypedResult] = useState("");
  const [analyzeStep, setAnalyzeStep] = useState<"config" | "result">("config");
  const [analyzeMonth, setAnalyzeMonth] = useState<string>(getCurrentYearMonth);
  const [analyzeComparePrev, setAnalyzeComparePrev] = useState(false);
  const [analyzePersona, setAnalyzePersona] =
    useState<PersonaValue>("bestie");

  useEffect(() => {
    if (!analysisResult) {
      setTypedResult("");
      return;
    }
    setTypedResult("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTypedResult(analysisResult.slice(0, i));
      if (i >= analysisResult.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [analysisResult]);

  const openAnalyze = () => {
    setAnalyzeStep("config");
    setAnalysisResult(null);
    setAnalysisError("");
    setIsAnalysisOpen(true);
  };

  const startAnalysis = async () => {
    setAnalyzeStep("result");
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError("");
    const monthStart = `${analyzeMonth}-01`;
    const monthEnd = getLastDayOfMonth(analyzeMonth);
    try {
      const incomeSummary = await getShoppingNotesSummary({
        startDate: monthStart,
        endDate: monthEnd,
        jenisTransaksi: "pemasukan",
      });
      let prevPeriod: AnalyzePeriod | undefined;
      let compareType: string;
      if (analyzeComparePrev) {
        const prevMonth = getPrevYearMonth(analyzeMonth);
        const prevStart = `${prevMonth}-01`;
        const prevEnd = getLastDayOfMonth(prevMonth);
        const prevSummary = await getShoppingNotesSummary({
          startDate: prevStart,
          endDate: prevEnd,
          jenisTransaksi: "pemasukan",
        });
        prevPeriod = {
          start_date: prevStart,
          end_date: prevEnd,
          total_count: prevSummary.total_count,
          total_amount: prevSummary.total_amount,
          categories: prevSummary.categories.map((c) => ({
            kategori_label: c.kategori_label,
            count: c.count,
            total: c.total,
          })),
        };
        compareType = "prev_month";
      } else {
        const expenseSummary = await getShoppingNotesSummary({
          startDate: monthStart,
          endDate: monthEnd,
          jenisTransaksi: "pengeluaran",
        });
        prevPeriod = {
          start_date: monthStart,
          end_date: monthEnd,
          total_count: expenseSummary.total_count,
          total_amount: expenseSummary.total_amount,
          categories: expenseSummary.categories.map((c) => ({
            kategori_label: c.kategori_label,
            count: c.count,
            total: c.total,
          })),
        };
        compareType = "vs_counterpart";
      }
      const result = await analyzeExpenses({
        start_date: monthStart,
        end_date: monthEnd,
        total_count: incomeSummary.total_count,
        total_amount: incomeSummary.total_amount,
        categories: incomeSummary.categories.map((c) => ({
          kategori_label: c.kategori_label,
          count: c.count,
          total: c.total,
        })),
        user_name: user?.name ?? undefined,
        prev_period: prevPeriod,
        compare_type: compareType,
        tx_type: "pemasukan",
        persona: analyzePersona,
      });
      setAnalysisResult(result);
    } catch (e: unknown) {
      setAnalysisError(
        e instanceof Error ? e.message : "Gagal menganalisa data",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchData = async (withLoader: boolean) => {
    if (withLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError("");
    try {
      const data = await getShoppingNotesSummary({
        startDate,
        endDate,
        jenisTransaksi: "pemasukan",
      });
      setSummary(data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Gagal mengambil data laporan";
      setError(message);
      showToast(message, { type: "error" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [startDate, endDate]);

  return (
    <>
      <button
        type="button"
        aria-label="Analisa pemasukan"
        onClick={openAnalyze}
        disabled={isLoading}
        className="fixed left-2 top-2 z-60 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:left-10 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
      >
        <DiamondIcon className="h-4 w-4" />
      </button>

      {isAnalysisOpen && (
        <div className="fixed inset-0 z-80 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsAnalysisOpen(false)}
          />
          <div className="relative z-10 flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/45 bg-white/95 shadow-[0_-12px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95 sm:h-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl sm:shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100/80 px-5 py-4 dark:border-slate-800/70">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <DiamondIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Analisa Pemasukan
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {analyzeStep === "config"
                      ? "Pilih bulan yang ingin dianalisa"
                      : formatYearMonth(analyzeMonth)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {analyzeStep === "result" && !isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => setAnalyzeStep("config")}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100/60 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  >
                    ← Ubah periode
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAnalysisOpen(false)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/60 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-24 sm:pb-6">
              {analyzeStep === "config" ? (
                <div className="flex flex-col gap-5">
                  <label className="space-y-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Bulan yang dianalisa
                    </span>
                    <input
                      type="month"
                      value={analyzeMonth}
                      max={getCurrentYearMonth()}
                      onChange={(e) => setAnalyzeMonth(e.target.value)}
                      className="w-full mt-2 rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
                    />
                  </label>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <label className="flex cursor-pointer select-none items-start gap-3">
                      <input
                        type="checkbox"
                        checked={analyzeComparePrev}
                        onChange={(e) =>
                          setAnalyzeComparePrev(e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-500 dark:border-slate-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Bandingkan dengan bulan sebelumnya
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {analyzeComparePrev
                            ? `Membandingkan pemasukan ${formatYearMonth(analyzeMonth)} vs ${formatYearMonth(getPrevYearMonth(analyzeMonth))}`
                            : `Membandingkan pemasukan vs pengeluaran di ${formatYearMonth(analyzeMonth)}`}
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="b-4 space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Sifat respon AI
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PERSONA_OPTIONS.map((option) => {
                        const isSelected = analyzePersona === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAnalyzePersona(option.value)}
                            className={
                              isSelected
                                ? "rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] transition-colors dark:bg-emerald-600"
                                : "rounded-full border border-slate-200 bg-white/40 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/40"
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                      {
                        PERSONA_OPTIONS.find(
                          (o) => o.value === analyzePersona,
                        )?.description
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startAnalysis}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    <DiamondIcon className="h-4 w-4" />
                    Mulai Analisa
                  </button>
                </div>
              ) : isAnalyzing ? (
                <div className="flex min-h-60 flex-col items-center justify-center gap-6">
                  <div className="relative mb-6 flex items-center justify-center">
                    <span className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-400/20 dark:bg-emerald-500/15" />
                    <span className="absolute h-10 w-10 animate-ping rounded-full bg-emerald-400/30 dark:bg-emerald-500/25 [animation-delay:200ms]" />
                    <LoaderCircle className="relative h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Lagi ngitung-ngitung pemasukan kamu...
                  </p>
                </div>
              ) : analysisError ? (
                <div className="px-2 py-10 text-center text-sm font-medium text-red-600 dark:text-red-400">
                  {analysisError}
                </div>
              ) : analysisResult ? (
                <div className="space-y-3 pb-16 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {typedResult
                    .split("\n")
                    .filter(Boolean)
                    .map((para, i, arr) => {
                      if (para.startsWith("****")) {
                        return (
                          <p
                            key={i}
                            className="text-center text-xs text-slate-400 dark:text-slate-600"
                          >
                            ~~ {para.slice(4)}
                            {i === arr.length - 1 &&
                              typedResult.length < analysisResult.length && (
                                <span
                                  className="animate-blink ml-0.5 inline-block w-0.5 bg-emerald-500 align-middle"
                                  style={{ height: "1em" }}
                                />
                              )}{" "}
                            ~~
                          </p>
                        );
                      }
                      return (
                        <p key={i}>
                          {para.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
                            chunk.startsWith("**") && chunk.endsWith("**") ? (
                              <strong
                                key={j}
                                className="font-semibold text-slate-900 dark:text-slate-100"
                              >
                                {chunk.slice(2, -2)}
                              </strong>
                            ) : (
                              chunk
                            ),
                          )}
                          {i === arr.length - 1 &&
                            typedResult.length < analysisResult.length && (
                              <span
                                className="animate-blink ml-0.5 inline-block w-0.5 bg-emerald-500 align-middle"
                                style={{ height: "1em" }}
                              />
                            )}
                        </p>
                      );
                    })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-white/45 bg-white/35 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Data Pemasukan
          </h2>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500 dark:text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data laporan...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        ) : (
          <>
            <div className="grid w-full grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35">
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  Total data
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {summary?.total_count ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35">
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  Jumlah kategori
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {summary?.categories.length ?? 0}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35">
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  Total nominal
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(summary?.total_amount ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/45 bg-white/20 dark:border-slate-700/70 dark:bg-slate-900/20">
              {!summary || summary.categories.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-300">
                  Belum ada summary untuk filter yang dipilih.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
                    {summary.categories.map((item) => (
                      <button
                        key={item.kategori_id}
                        type="button"
                        onClick={() => setSelectedCategory(item)}
                        className="w-full cursor-pointer px-4 py-4 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 active:bg-slate-100/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                            {getExpenseTypeIcon(item.icon, item.kategori_label)}
                            <span className="truncate">
                              {item.kategori_label || "Tanpa kategori"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-gray-50 px-3 py-1.5 text-right dark:bg-slate-800/70">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                              Data
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              {item.count}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                            Total nominal
                          </p>
                          <p className="text-base font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-600 dark:bg-slate-800/60 dark:text-slate-200">
                          <th className="px-5 py-4 font-semibold">Kategori</th>
                          <th className="px-5 py-4 font-semibold">
                            Jumlah data
                          </th>
                          <th className="px-5 py-4 font-semibold">
                            Total nominal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.categories.map((item) => (
                          <tr
                            key={item.kategori_id}
                            onClick={() => setSelectedCategory(item)}
                            className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/30"
                          >
                            <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                                {getExpenseTypeIcon(
                                  item.icon,
                                  item.kategori_label,
                                )}
                                {item.kategori_label || "Tanpa kategori"}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-slate-300">
                              {item.count}
                            </td>
                            <td className="px-5 py-4 font-semibold tracking-[0.08em] tabular-nums text-gray-900 dark:text-slate-100">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {selectedCategory && (
        <CategoryNotesModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          kategoriId={selectedCategory.kategori_id}
          kategoriLabel={selectedCategory.kategori_label}
          kategoriIcon={selectedCategory.icon}
          startDate={startDate}
          endDate={endDate}
          totalAmount={selectedCategory.total}
        />
      )}
    </>
  );
}
