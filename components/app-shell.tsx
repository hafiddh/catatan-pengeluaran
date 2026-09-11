// components/app-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, List, LogOut, Moon, Sun, User, X } from "lucide-react";
import { useEffect, useState } from "react";

export type AppShellProps = {
  user: { name?: string; picture?: string };
  children: React.ReactNode;
};

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [profileSrc, setProfileSrc] = useState<string>(user.picture ?? "");
  const [profileName, setProfileName] = useState<string>(user.name ?? "");
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] =
    useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] =
    useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storageKey = "theme-preference";
      const root =
        typeof document !== "undefined" ? document.documentElement : null;
      if (!root) return;

      const applyTheme = (nextIsDark: boolean) => {
        try {
          root.classList.toggle("dark", nextIsDark);
          root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
        } catch {}
        setIsDark(nextIsDark);
      };

      const saved = (() => {
        try {
          return localStorage.getItem(storageKey);
        } catch {
          return null;
        }
      })();

      const mq =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

      if (saved === "dark" || saved === "light") {
        applyTheme(saved === "dark");
        return;
      }

      const initial = mq ? mq.matches : false;
      applyTheme(initial);

      const listener = (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          applyTheme((e as MediaQueryList).matches);
        } catch {}
      };

      try {
        if (mq) {
          if ((mq as MediaQueryList).addEventListener) {
            (mq as MediaQueryList).addEventListener(
              "change",
              listener as EventListener,
            );
          } else {
            (mq as MediaQueryList).addListener(
              listener as (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
            );
          }
        }
      } catch {}

      return () => {
        try {
          if (mq) {
            if ((mq as MediaQueryList).removeEventListener) {
              (mq as MediaQueryList).removeEventListener(
                "change",
                listener as EventListener,
              );
            } else {
              (mq as MediaQueryList).removeListener(
                listener as (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
              );
            }
          }
        } catch {}
      };
    } catch {}
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // proceed to redirect regardless
    }
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!isProfilePreviewOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfilePreviewOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isProfilePreviewOpen]);

  const openProfilePreview = () => {
    if (!profileSrc) return;
    setIsProfilePreviewOpen(true);
  };

  const closeProfilePreview = () => {
    setIsProfilePreviewOpen(false);
  };

  const navItemClass = (active: boolean, extraClassName = "") =>
    [
      "group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-center transition-all duration-300 ease-out sm:px-3 sm:py-3",
      "focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50",
      active
        ? "-translate-y-0.5 bg-white/60 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(148,163,184,0.16)] dark:bg-slate-800/80 dark:text-white"
        : "text-slate-700 hover:bg-white/30 dark:text-slate-200 dark:hover:bg-slate-800/45",
      extraClassName,
    ].join(" ");

  const navIndicatorClass = (active: boolean) =>
    [
      "absolute left-1/2 top-1 h-0.5 w-8 -translate-x-1/2 rounded-full transition-all duration-300 ease-out sm:top-1.5 sm:w-10",
      active
        ? "scale-100 opacity-100 bg-black dark:bg-white"
        : "scale-75 opacity-0 bg-transparent shadow-none",
    ].join(" ");

  const navIconClass = (active: boolean) =>
    [
      "h-4.5 w-4.5 transition-all duration-300 ease-out sm:h-5 sm:w-5",
      active
        ? "scale-105 text-slate-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] dark:text-slate-100 dark:drop-shadow-[0_0_14px_rgba(226,232,240,0.35)]"
        : "text-current group-hover:text-slate-600 dark:group-hover:text-slate-100",
    ].join(" ");

  const navIconFrameClass = (active: boolean) =>
    [
      "mb-1 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ease-out sm:mb-1.5 sm:h-9 sm:w-9",
      active
        ? "scale-105 border-slate-200 bg-white/90 shadow-[0_8px_20px_rgba(148,163,184,0.18)] dark:border-slate-600/80 dark:bg-slate-700/70"
        : "border-transparent bg-transparent group-hover:border-white/35 group-hover:bg-white/20 dark:group-hover:border-slate-700/70 dark:group-hover:bg-slate-800/35",
    ].join(" ");

  const navLabelClass = (active: boolean) =>
    [
      "text-[10px] leading-none transition-all duration-300 ease-out sm:text-xs",
      active
        ? "font-semibold tracking-[0.01em] text-slate-700 dark:text-slate-100"
        : "text-current",
    ].join(" ");

  return (
    <div className="relative min-h-screen">
      <main className="relative z-0 flex items-center justify-center pb-28 sm:pb-32">
        <div
          className="relative mx-auto w-full max-w-full px-4 sm:max-w-xl"
          style={{ overflow: "auto" }}
        >
          {children}
        </div>
      </main>

      <button
        type="button"
        id="theme-toggle"
        aria-label="Toggle theme"
        className="fixed right-2 top-2 z-60 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:right-10 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
        onClick={() => {
          try {
            const root =
              typeof document !== "undefined" ? document.documentElement : null;
            const nextIsDark = !isDark;
            if (root) {
              root.classList.toggle("dark", nextIsDark);
              root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
            }
            localStorage.setItem("theme-preference", nextIsDark ? "dark" : "light");
            setIsDark(nextIsDark);
          } catch {}
        }}
      >
        {isDark ? (
          <Moon className="h-5 w-5 drop-shadow-[0_0_10px_rgba(226,232,240,0.3)]" />
        ) : (
          <Sun className="h-5 w-5 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
        )}
      </button>

      <nav
        aria-label="Bottom navigation"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-70 px-4"
      >
        <div className="pointer-events-auto relative mx-auto max-w-full sm:max-w-xl">
          <div className="p-1.5 rounded-2xl border border-white/50 bg-white/38 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xs supports-backdrop-filter:bg-white/24 dark:border-slate-700/70 dark:bg-slate-900/38 dark:supports-backdrop-filter:bg-slate-900/24 ">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <Link
                  href="/dashboard"
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                  className={navItemClass(pathname === "/dashboard")}
                >
                  <span className={navIndicatorClass(pathname === "/dashboard")} />
                  <span className={navIconFrameClass(pathname === "/dashboard")}>
                    <Home className={navIconClass(pathname === "/dashboard")} />
                  </span>
                  <span className={navLabelClass(pathname === "/dashboard")}>
                    Dashboard
                  </span>
                </Link>

                <Link
                  href="/list"
                  aria-current={pathname === "/list" ? "page" : undefined}
                  className={navItemClass(pathname === "/list")}
                >
                  <span className={navIndicatorClass(pathname === "/list")} />
                  <span className={navIconFrameClass(pathname === "/list")}>
                    <List className={navIconClass(pathname === "/list")} />
                  </span>
                  <span className={navLabelClass(pathname === "/list")}>List</span>
                </Link>
              </div>

              <div aria-hidden="true" className="h-full w-12 shrink-0" />

              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <Link
                  href="/laporan"
                  aria-current={pathname === "/laporan" ? "page" : undefined}
                  className={navItemClass(pathname === "/laporan")}
                >
                  <span className={navIndicatorClass(pathname === "/laporan")} />
                  <span className={navIconFrameClass(pathname === "/laporan")}>
                    <FileText className={navIconClass(pathname === "/laporan")} />
                  </span>
                  <span className={navLabelClass(pathname === "/laporan")}>
                    Laporan
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className={navItemClass(false, "cursor-pointer")}
                >
                  <span className={navIconFrameClass(false)}>
                    <LogOut className={navIconClass(false)} />
                  </span>
                  <span className={navLabelClass(false)}>Logout</span>
                </button>
              </div>
            </div>

            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[36%] transform transition-transform duration-300 ease-out">
              <button
                type="button"
                onClick={openProfilePreview}
                aria-label={
                  profileSrc ? "Lihat foto profil" : "Foto profil belum tersedia"
                }
                aria-haspopup={profileSrc ? "dialog" : undefined}
                aria-disabled={!profileSrc}
                className={[
                  "group flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/65 bg-white/40 p-0.5 shadow-[0_22px_45px_rgba(15,23,42,0.24)] backdrop-blur-2xl transition-all duration-300 ease-out supports-backdrop-filter:bg-white/26 dark:border-slate-700/75 dark:bg-slate-900/40 dark:supports-backdrop-filter:bg-slate-900/24 sm:h-20 sm:w-20",
                  profileSrc
                    ? "pointer-events-auto cursor-zoom-in hover:scale-[1.04] hover:shadow-[0_26px_52px_rgba(15,23,42,0.28)] focus:outline-none focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-slate-500/50"
                    : "cursor-default",
                ].join(" ")}
              >
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/40 bg-slate-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-slate-700/60 dark:bg-slate-800/75">
                  {profileSrc ? (
                    <>
                      <img
                        src={profileSrc}
                        alt={profileName ? `Foto profil ${profileName}` : "Foto profil"}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-950/0 transition-colors duration-300 group-hover:bg-slate-950/10 dark:group-hover:bg-slate-950/18" />
                    </>
                  ) : (
                    <User className="h-6 w-6 text-gray-600 dark:text-slate-300 sm:h-8 sm:w-8" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/45 px-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsLogoutConfirmOpen(false)} />
          <section className="relative z-10 w-full max-w-sm rounded-3xl border border-white/45 bg-white/35 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/40 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-200">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Keluar dari akun?
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                  Sesi Anda akan diakhiri dan Anda perlu login kembali.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/45 bg-white/35 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/45 bg-white/35 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
              >
                <LogOut className="h-4 w-4" />
                Ya, keluar
              </button>
            </div>
          </section>
        </div>
      )}

      {isProfilePreviewOpen ? (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Preview foto profil"
          onClick={closeProfilePreview}
        >
          <div
            className="relative w-full max-w-md rounded-4xl border border-white/20 bg-white/10 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/25"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProfilePreview}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-slate-950/35 text-white transition-all duration-300 ease-out hover:bg-slate-950/55 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Tutup preview foto profil"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/70 dark:bg-slate-900/60">
              <img
                src={profileSrc}
                alt={profileName ? `Preview foto profil ${profileName}` : "Preview foto profil"}
                className="h-auto max-h-[72vh] w-full object-cover"
              />
            </div>

            {profileName ? (
              <p className="px-2 pb-1 pt-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                {profileName}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
