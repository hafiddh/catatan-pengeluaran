"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Segment =
  | { type: "num"; raw: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" };

function evaluateSegments(segs: Segment[]): number {
  const nums: number[] = [];
  const ops: Array<"+" | "-" | "*" | "/"> = [];
  for (const s of segs) {
    if (s.type === "num") nums.push(Number(s.raw) || 0);
    else ops.push(s.value);
  }
  if (nums.length === 0) return 0;
  let result = nums[0];
  for (let i = 0; i < ops.length; i++) {
    if (i + 1 >= nums.length) break;
    const n = nums[i + 1];
    if (ops[i] === "+") result += n;
    else if (ops[i] === "-") result -= n;
    else if (ops[i] === "*") result *= n;
    else if (ops[i] === "/" && n !== 0) result /= n;
  }
  return Math.max(0, Math.round(result));
}

function formatRupiahNum(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDigits(raw: string): string {
  if (!raw) return "0";
  const n = Number(raw);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : raw;
}

function formatExpression(segs: Segment[]): string {
  const sym = { "+": "+", "-": "-", "*": "×", "/": "÷" } as const;
  return segs
    .map((s) =>
      s.type === "num" ? formatDigits(s.raw) : ` ${sym[s.value]} `,
    )
    .join("")
    .trim();
}

function applyKey(segs: Segment[], key: string): Segment[] {
  if (key === "back") {
    if (segs.length === 0) return segs;
    const last = segs[segs.length - 1];
    if (last.type === "op") return segs.slice(0, -1);
    const newRaw = last.raw.slice(0, -1);
    if (!newRaw) return segs.slice(0, -1);
    return [...segs.slice(0, -1), { type: "num", raw: newRaw }];
  }

  if (["+", "-", "*", "/"].includes(key)) {
    if (segs.length === 0) return segs;
    const last = segs[segs.length - 1];
    const op = key as "+" | "-" | "*" | "/";
    if (last.type === "op") return [...segs.slice(0, -1), { type: "op", value: op }];
    if (last.type === "num" && last.raw) return [...segs, { type: "op", value: op }];
    return segs;
  }

  const last = segs.length > 0 ? segs[segs.length - 1] : null;
  if (!last || last.type === "op") {
    return [...segs, { type: "num", raw: key === "000" ? "0" : key }];
  }
  let newRaw: string;
  if (key === "000") {
    newRaw = last.raw === "0" || last.raw === "" ? "0" : last.raw + "000";
  } else if (last.raw === "0") {
    newRaw = key; // replace leading zero
  } else {
    newRaw = (last.raw || "") + key;
  }
  if (newRaw.length > 13) return segs;
  return [...segs.slice(0, -1), { type: "num", raw: newRaw }];
}

type AmountInputProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
};

const KEYS = [
  ["1", "2", "3", "/"],
  ["4", "5", "6", "*"],
  ["7", "8", "9", "-"],
  ["0", "000", "back", "+"],
] as const;

const KEY_LABEL: Record<string, string> = {
  "/": "÷",
  "*": "×",
  back: "⌫",
};

const OP_KEYS = new Set(["/", "*", "-", "+", "back"]);

export function AmountInput({
  value,
  onChange,
  disabled,
  className,
}: AmountInputProps) {
  const [segments, setSegments] = useState<Segment[]>(() =>
    value ? [{ type: "num", raw: value }] : [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const lastEmitted = useRef<string>(value || "");

  useEffect(() => {
    if (value === lastEmitted.current) return;
    setSegments(value ? [{ type: "num", raw: value }] : []);
  }, [value]);

  const pressKey = (key: string) => {
    setSegments((prev) => {
      const next = applyKey(prev, key);
      const result = evaluateSegments(next);
      const emitVal = result > 0 ? String(result) : "";
      lastEmitted.current = emitVal;
      onChange(emitVal);
      return next;
    });
  };

  const result = evaluateSegments(segments);
  const hasValue = segments.some((s) => s.type === "num" && s.raw !== "");
  const displayResult = hasValue ? formatRupiahNum(result) : null;
  const expressionStr = segments.length >= 2 ? formatExpression(segments) : "";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className={
          "w-full rounded-2xl border border-white/45 bg-white/35 px-3.5 py-2.5 text-center font-bold shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:border-slate-700/70 dark:bg-slate-900/35 dark:focus:ring-slate-500/50 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 disabled:opacity-40 " +
          (displayResult
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-400 dark:text-slate-500") +
          " " +
          (className || "")
        }
      >
        {displayResult ?? "Rp 0"}
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
          <div
            className="fixed inset-0 z-200 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-201 rounded-t-3xl border-t border-white/30 bg-white/98 shadow-[0_-16px_48px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/98">
            {/* Result display */}
            <div className="flex items-start justify-between px-5 pb-3 pt-5">
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "truncate text-4xl font-bold " +
                    (displayResult
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-300 dark:text-slate-600")
                  }
                >
                  {displayResult ?? "Rp 0"}
                </p>
                {expressionStr ? (
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                    {expressionStr}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-transparent select-none">—</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-4 mt-1 shrink-0 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Selesai
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-slate-100 dark:bg-slate-800" />

            {/* Keypad */}
            <div
              className="grid grid-cols-4 gap-2.5 px-4 pb-8 pt-3"
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {KEYS.flat().map((key) => {
                const isSpecial = OP_KEYS.has(key);
                const label = KEY_LABEL[key] ?? key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressKey(key)}
                    style={{ touchAction: "manipulation" }}
                    className={
                      "flex h-14 items-center justify-center rounded-2xl text-xl font-semibold transition-all active:scale-95 " +
                      (isSpecial
                        ? "bg-slate-100/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.07)] dark:bg-slate-800/60 dark:text-slate-100")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          </>,
          document.body,
        )}
    </>
  );
}
