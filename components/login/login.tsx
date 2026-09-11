"use client";

import { loginWithGoogle } from "@/lib/client/login";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const LoginPage = () => {
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [isDark, setIsDark] = useState(false);

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
              listener as (
                this: MediaQueryList,
                ev: MediaQueryListEvent,
              ) => any,
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
                listener as (
                  this: MediaQueryList,
                  ev: MediaQueryListEvent,
                ) => any,
              );
            }
          }
        } catch {}
      };
    } catch {}
  }, []);

  const onSuccessGoogle = async (credentialResponse: CredentialResponse) => {
    setGoogleError("");
    setIsLoggingIn(true);
    try {
      await loginWithGoogle(credentialResponse.credential || "");
      router.push("/dashboard");
    } catch (error: unknown) {
      setGoogleError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat login Google",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onErrorGoogle = () => {
    setGoogleError("Login Google gagal. Coba ulangi lagi.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-100 dark:bg-slate-950">
      <button
        type="button"
        id="theme-toggle"
        aria-label="Toggle theme"
        className="cursor-pointer fixed right-2 top-2 z-50 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/45 bg-white/35 text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 hover:text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/55 dark:hover:text-slate-50 sm:right-10 sm:top-10 supports-backdrop-filter:bg-white/25 dark:supports-backdrop-filter:bg-slate-900/25"
        onClick={() => {
          try {
            const root =
              typeof document !== "undefined" ? document.documentElement : null;
            const nextIsDark = !isDark;
            if (root) {
              root.classList.toggle("dark", nextIsDark);
              root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
            }
            localStorage.setItem(
              "theme-preference",
              nextIsDark ? "dark" : "light",
            );
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

      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl p-7 dark:bg-slate-900 dark:border-slate-700">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Pencatatan Keuangan Simpel
          </h1>

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Masuk menggunakan akun Google untuk melanjutkan
          </p>
        </div>

        <div className="space-y-4">
          {googleError && (
            <p className="text-xs text-red-500 font-medium text-center">
              {googleError}
            </p>
          )}

          {isLoggingIn && (
            <div className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memproses login...
            </div>
          )}

          <div className="flex justify-center pt-1">
            <GoogleLogin
              onSuccess={onSuccessGoogle}
              onError={onErrorGoogle}
              text="signin_with"
              shape="pill"
              size="large"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
          <span className="text-[10px] uppercase tracking-widest text-gray-400">
            Powered by
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
        </div>

        <div className="flex justify-center">
          <div className="w-40 flex items-center justify-center">
            <img
              src="/images/logo-light.png"
              alt="Logo aplikasi"
              className="w-auto h-auto object-contain dark:hidden"
            />
            <img
              src="/images/logo-dark.png"
              alt="Logo aplikasi"
              className="hidden w-auto h-auto object-contain dark:block"
            />
          </div>
        </div>
      </section>
    </main>
  );
};
