import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center dark:bg-slate-950">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Halaman yang kamu cari tidak tersedia.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-2xl border border-white/45 bg-white/35 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-800/45"
      >
        Kembali ke Login
      </Link>
    </main>
  );
}
