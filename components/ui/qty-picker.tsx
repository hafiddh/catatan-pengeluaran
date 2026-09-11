"use client";

import { useEffect, useRef } from "react";

type QtyPickerProps = {
  value: number; // 0 = kosong ("-"), 1–99 = qty aktual
  onChange: (next: number) => void;
  disabled?: boolean;
};

const ITEM_HEIGHT = 40;

const ITEMS = [
  { key: "0", label: "-", value: 0 },
  ...Array.from({ length: 99 }, (_, i) => ({
    key: String(i + 1),
    label: String(i + 1),
    value: i + 1,
  })),
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function scrollToIndex(el: HTMLDivElement | null, index: number) {
  if (!el) return;
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: "auto" });
}

function indexFromScrollTop(scrollTop: number, maxIndex: number): number {
  return clamp(Math.round(scrollTop / ITEM_HEIGHT), 0, maxIndex);
}

export function QtyPicker({ value, onChange, disabled }: QtyPickerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isProgrammatic = useRef(false);

  const selectedIndex = clamp(value, 0, ITEMS.length - 1);

  useEffect(() => {
    isProgrammatic.current = true;
    scrollToIndex(ref.current, selectedIndex);
    const t = window.setTimeout(() => {
      isProgrammatic.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [selectedIndex]);

  const onScroll = () => {
    if (disabled || !ref.current || isProgrammatic.current) return;
    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      if (!ref.current) return;
      const nextIndex = indexFromScrollTop(
        ref.current.scrollTop,
        ITEMS.length - 1,
      );
      const nextValue = ITEMS[nextIndex]?.value ?? 0;
      if (nextValue !== value) onChange(nextValue);
    });
  };

  return (
    <div className="w-full rounded-2xl border border-white/45 bg-white/35 px-2.5 py-0.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/35 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25">
      <div className="relative">
        <div
          ref={ref}
          role="listbox"
          aria-label="Pilih qty"
          tabIndex={disabled ? -1 : 0}
          onScroll={onScroll}
          className="relative z-10 hide-scrollbar overflow-y-auto"
          style={{
            height: ITEM_HEIGHT,
            paddingTop: 0,
            paddingBottom: 0,
            scrollSnapType: "y mandatory",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? "none" : "auto",
          }}
        >
          {ITEMS.map((item, idx) => {
            const selected = idx === selectedIndex;
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(item.value)}
                className={
                  "relative z-10 w-full rounded-xl text-center select-none transition-all duration-300 ease-out " +
                  (selected
                    ? "font-semibold text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500")
                }
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
