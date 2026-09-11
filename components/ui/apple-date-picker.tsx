"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AppleDatePickerProps = {
  value: string;
  onChange: (nextISODate: string) => void;
  className?: string;
  disabled?: boolean;
  yearStart?: number;
  yearEnd?: number;
};

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 1;
const PADDING_ITEMS = 0.5;

const MONTH_LABELS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function todayLocalISODate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseISODate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m) {
    const fallback = parseISODate(todayLocalISODate());
    return fallback;
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return parseISODate(todayLocalISODate());
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  const safeMonth = clamp(month, 1, 12);
  return new Date(year, safeMonth, 0).getDate();
}

function buildISODate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function scrollToIndex(el: HTMLDivElement | null, index: number) {
  if (!el) return;
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: "auto" });
}

function indexFromScrollTop(scrollTop: number, maxIndex: number): number {
  const raw = Math.round(scrollTop / ITEM_HEIGHT);
  return clamp(raw, 0, maxIndex);
}

type WheelColumnProps = {
  items: Array<{ key: string; label: string }>;
  selectedIndex: number;
  onSelectIndex: (nextIndex: number) => void;
  disabled?: boolean;
  ariaLabel: string;
};

function WheelColumn({
  items,
  selectedIndex,
  onSelectIndex,
  disabled,
  ariaLabel,
}: WheelColumnProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    isProgrammaticScroll.current = true;
    scrollToIndex(ref.current, selectedIndex);
    const t = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [selectedIndex]);

  const onScroll = () => {
    if (disabled) return;
    if (!ref.current) return;
    if (isProgrammaticScroll.current) return;

    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      if (!ref.current) return;
      const maxIndex = Math.max(0, items.length - 1);
      const nextIndex = indexFromScrollTop(ref.current.scrollTop, maxIndex);
      if (nextIndex !== selectedIndex) onSelectIndex(nextIndex);
    });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={ariaLabel}
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        onScroll={onScroll}
        className="relative z-10 hide-scrollbar overflow-y-auto"
        style={{
          height: ITEM_HEIGHT * (VISIBLE_ITEMS + PADDING_ITEMS * 2),
          paddingTop: ITEM_HEIGHT * PADDING_ITEMS,
          paddingBottom: ITEM_HEIGHT * PADDING_ITEMS,
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        {items.map((it, idx) => {
          const selected = idx === selectedIndex;
          return (
            <button
              key={it.key}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelectIndex(idx)}
              className={
                "relative z-10 w-full rounded-xl text-center select-none transition-all duration-300 ease-out " +
                (selected
                  ? "font-semibold text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-slate-500")
              }
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: "center",
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 z-0"
        style={{
          top: "50%",
          height: ITEM_HEIGHT,
          transform: "translateY(-50%)",
        }}
      >
        <div className="h-full rounded-xl border border-white/55 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_24px_rgba(148,163,184,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-800/55" />
      </div>
    </div>
  );
}

export function AppleDatePicker({
  value,
  onChange,
  className,
  disabled,
  yearStart,
  yearEnd,
}: AppleDatePickerProps) {
  const initial = useMemo(
    () => parseISODate(value || todayLocalISODate()),
    [value],
  );
  const [year, setYear] = useState<number>(initial.year);
  const [month, setMonth] = useState<number>(initial.month);
  const [day, setDay] = useState<number>(initial.day);

  const years = useMemo(() => {
    const start = yearStart ?? 1970;
    const end = yearEnd ?? 2100;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const out: Array<{ key: string; label: string; value: number }> = [];
    for (let y = s; y <= e; y++)
      out.push({ key: String(y), label: String(y), value: y });
    return out;
  }, [yearStart, yearEnd]);

  const months = useMemo(
    () =>
      MONTH_LABELS_ID.map((label, idx) => ({
        key: String(idx + 1),
        label,
        value: idx + 1,
      })),
    [],
  );

  const days = useMemo(() => {
    const max = daysInMonth(year, month);
    const out: Array<{ key: string; label: string; value: number }> = [];
    for (let d = 1; d <= max; d++)
      out.push({ key: String(d), label: String(d), value: d });
    return out;
  }, [year, month]);

  const yearIndex = useMemo(() => {
    const idx = years.findIndex((y) => y.value === year);
    return idx >= 0 ? idx : 0;
  }, [years, year]);

  const monthIndex = clamp(month - 1, 0, 11);
  const dayIndex = clamp(day - 1, 0, Math.max(0, days.length - 1));

  useEffect(() => {
    const parsed = parseISODate(value || todayLocalISODate());
    setYear(parsed.year);
    setMonth(parsed.month);
    setDay(parsed.day);
  }, [value]);

  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [year, month, day]);

  useEffect(() => {
    onChange(
      buildISODate(year, month, clamp(day, 1, daysInMonth(year, month))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  return (
    <div
      className={
        "w-full rounded-2xl border border-white/45 bg-white/35 px-2.5 py-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25 " +
        (className || "")
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <WheelColumn
          ariaLabel="Pilih hari"
          disabled={disabled}
          items={days.map((d) => ({ key: d.key, label: d.label }))}
          selectedIndex={dayIndex}
          onSelectIndex={(idx) => setDay(days[idx]?.value ?? 1)}
        />
        <WheelColumn
          ariaLabel="Pilih bulan"
          disabled={disabled}
          items={months.map((m) => ({ key: m.key, label: m.label }))}
          selectedIndex={monthIndex}
          onSelectIndex={(idx) => setMonth(months[idx]?.value ?? 1)}
        />
        <WheelColumn
          ariaLabel="Pilih tahun"
          disabled={disabled}
          items={years.map((y) => ({ key: y.key, label: y.label }))}
          selectedIndex={yearIndex}
          onSelectIndex={(idx) =>
            setYear(years[idx]?.value ?? years[0]?.value ?? 1970)
          }
        />
      </div>
    </div>
  );
}
