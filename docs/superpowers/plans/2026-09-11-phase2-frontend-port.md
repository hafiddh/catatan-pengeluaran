# Phase 2: Port Astro Frontend to Next.js App Router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `fe/` (Astro + React, bearer-token/localStorage auth) into `catatan-pengeluaran/app/` (Next.js App Router, httpOnly-cookie auth from Phase 1), so the whole product is one deployable Next.js app.

**Architecture:** Server Component `app/(app)/layout.tsx` gates every protected page via `requireUser()` (no client-side auth flash). All 27 `fe/` React components port as Client Components with mechanical import-path fixes; six of them additionally drop a now-dead `token`-prop-threading pattern since cookies are sent automatically. A new `lib/client/` mirrors `lib/server/`: a cookie-aware `fetch` wrapper plus one service module per resource, replacing `fe/`'s localStorage/Bearer-token stack.

**Tech Stack:** Next.js 16.3.4 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, `@react-oauth/google`, `lucide-react`, `react-easy-crop`.

**Spec:** `catatan-pengeluaran/docs/superpowers/specs/2026-09-11-phase2-frontend-port-design.md`

## Global Constraints

- **1:1 behavioral port, no redesign.** Every page/component/interaction from `fe/` is reproduced as-is. `maintenance.astro` (snake/breakout minigame) is the one explicit exception — dropped, not ported.
- **Auth is server-side.** `app/(app)/layout.tsx` calls `requireUser()` (from Phase 1's `lib/server/session.ts`) directly; `UnauthorizedError` → `redirect('/login')`. No client-side "am I logged in" check anywhere.
- **All client fetches use `credentials: 'include'`, never an `Authorization` header.** On a `401` whose JSON body's `message` is exactly `"JWT tidak valid"`, call `POST /api/auth/refresh` once (no body), retry the original request once; if that also fails, hard-redirect (`window.location.href = '/login'`).
- **Logout**: `POST /api/auth/logout`, then navigate to `/login`. The old manual `document.cookie`-expiry loop is deleted outright (cannot clear httpOnly cookies).
- **Styling ports verbatim** from `fe/src/assets/styles/style.css` (299 lines) into `app/globals.css`. No token redesign.
- **Components are Client Components** (`'use client'`). Only `app/(app)/layout.tsx` and the `app/login/page.tsx` wrapper are Server Components.
- **Route paths are unchanged**: `/login` (was `/`), `/dashboard`, `/list`, `/laporan`, `/profile`.
- **Path alias remap** — `fe/`'s `astro.config.mjs` defines `@` → `fe/src` and `@components` → `fe/src/components`; `catatan-pengeluaran/tsconfig.json` defines only `@/*` → repo root (`./*`). Every ported file needs its imports rewritten per this table:

  | Old (`fe/`) | New (`catatan-pengeluaran/`) |
  |---|---|
  | `@components/ui/X` | `@/components/ui/X` (add the slash — same sub-path) |
  | `@/components/ui/X` | `@/components/ui/X` (unchanged — same sub-path, alias root differs but resolves the same since the file lives at the same relative sub-path under the new root) |
  | `@/service/notes` | `@/lib/client/notes` |
  | `@/service/expense-types` | `@/lib/client/expense-types` |
  | `@/service/income-types` | `@/lib/client/income-types` |
  | `@/service/login` | `@/lib/client/login` |
  | `@/lib/api` (`authorizedFetch`, `getErrorMessage`) | `@/lib/client/api` (`apiFetch`, `getErrorMessage`) — `authorizedFetch` renamed `apiFetch`, drops its 3rd `preferredToken` arg (unused at every call site anyway — see Task 9) |
  | `@/lib/auth-session` | deleted entirely (see Token-removal below) |
  | `@/lib/simpleToast` | `@/lib/client/simple-toast` |
  | `@/lib/expense-icons` | `@/lib/client/expense-icons` |
  | `@/contexts/AuthProvider` | `@/lib/client/auth-context` |
  | `astro:transitions/client` (`navigate`) | `next/navigation` (`useRouter().push`) |

- **Token-prop threading is removed.** `fe/src/components/modules/{dashboard,laporan,list}` top-level page components (`dashboard.tsx`, `laporan.tsx`, `list.tsx`) each read `localStorage.getItem("auth_token")` into a `token` variable and pass it as a `token` prop down to child forms/views, which pass it as the **first argument** to every service-layer call (`listIncomeTypes(token)`, `createShoppingNote(token, payload)`, etc.). This entire chain is deleted — new `lib/client/` service functions take no token argument (cookies ride along automatically), so: remove the `token` `useMemo` block in the three top-level components, remove `token={token}` from every child element, remove `token: string` from every child's Props type and from its destructured parameters, remove `token` from every `useMemo`/`useCallback`/`useEffect` dependency array it appears in, delete the `hasStoredAuth`/`canRefreshSession` guard pattern (`const canRefreshSession = useMemo(() => hasStoredAuth(), []);` plus any `if (!token && !canRefreshSession) return;`-shaped early return) since server-side gating already guarantees these components only render for an authenticated user, and drop `token` as the first argument from every service call site. Files this applies to: `dashboard.tsx`, `pemasukan-form.tsx`, `pengeluaran-form.tsx`, `laporan.tsx`, `laporan-pemasukan.tsx`, `laporan-pengeluaran.tsx`, `list.tsx`, `list-pemasukan.tsx`, `list-pengeluaran.tsx`. Two of these (`laporan-pemasukan.tsx`, `laporan-pengeluaran.tsx`) also call `getStoredUser()?.name` for the `user_name` field sent to `/api/notes/analyze` — replace with `useAuth().user?.name` from the new `lib/client/auth-context.tsx`.
- Source directory for every "port" task below is `fe/src/` relative to the repo root (sibling of `catatan-pengeluaran/`).

---

### Task 1: Add frontend dependencies

**Files:**
- Modify: `catatan-pengeluaran/package.json`

**Interfaces:**
- Produces: `@react-oauth/google`, `lucide-react`, `framer-motion`, `react-easy-crop`, `tailwind-merge` available as imports for every later task.

- [ ] **Step 1: Install**

```bash
cd catatan-pengeluaran
npm install @react-oauth/google lucide-react react-easy-crop
```

`js-cookie` and `jwt-decode` are in `fe/`'s `package.json` but grep-confirmed unused anywhere in `fe/src` — **not** installed here. `framer-motion` and `tailwind-merge` are also skipped: grep confirms `framer-motion` is imported only by the two maintenance-minigame files (`block-breaker.tsx`, `ular-ular.tsx`, both dropped per Decisions), and `tailwind-merge` only by `fe/src/libs/cn.ts`, which is itself dead code (only consumer was the dead `.astro` UI primitives identified during spec research — see the spec's "Files intentionally not ported" note).

- [ ] **Step 2: Sanity-check it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports these yet, but confirms the install didn't break anything).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add frontend dependencies for Phase 2 (google oauth, icons, motion, crop)"
```

---

### Task 2: Client fetch wrapper (`lib/client/api.ts`)

**Files:**
- Create: `catatan-pengeluaran/lib/client/api.ts`

**Interfaces:**
- Produces: `apiFetch(path: string, init?: RequestInit): Promise<Response>`, `getErrorMessage(response: Response, fallback: string): Promise<string>`. Used by every `lib/client/*` service module (Task 4) and directly by `receipt-scanner.tsx`/`voice-note.tsx` (Task 9).

**Context:** replaces `fe/src/lib/api.ts` + `fe/src/lib/auth-session.ts`. Cookies ride along automatically on same-origin `fetch` calls once `credentials: 'include'` is set — no token storage, no `Authorization` header, no `API_BASE_URL` env var (FE and API now share one origin, so every call is a plain relative `/api/...` path).

- [ ] **Step 1: Write the implementation**

```typescript
// lib/client/api.ts
let refreshInFlight: Promise<boolean> | null = null;

async function parseMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // ignore non-json payload
  }
  return "";
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const requestInit: RequestInit = { ...init, credentials: "include" };

  let response = await fetch(`/api${path}`, requestInit);

  if (response.status === 401) {
    const message = await parseMessage(response);
    if (message === "JWT tidak valid") {
      const refreshed = await refreshSession();
      if (refreshed) {
        response = await fetch(`/api${path}`, requestInit);
      }
      if (!refreshed || response.status === 401) {
        redirectToLogin();
      }
    }
  }

  return response;
}

export async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  return (await parseMessage(response)) || fallbackMessage;
}
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/client/api.ts
git commit -m "feat: add cookie-based client fetch wrapper with 401-refresh-retry"
```

---

### Task 3: `simple-toast.ts` and `expense-icons.ts` (verbatim ports)

**Files:**
- Create: `catatan-pengeluaran/lib/client/simple-toast.ts`
- Create: `catatan-pengeluaran/lib/client/expense-icons.ts`

**Interfaces:**
- Produces: `showToast(message, opts?)` (default export), `clearToasts()` from `simple-toast.ts`; `EXPENSE_ICONS`, `getExpenseIcon(key)`, `Plus`, `Tag` from `expense-icons.ts`. `expense-icons.ts` is used by Task 8; `simple-toast.ts` is used by Tasks 9, 13, 14, 15.

**Context:** both files are self-contained in `fe/` (zero `@`-aliased imports — confirmed by reading both in full), so this is a byte-for-byte copy, only the file location changes.

- [ ] **Step 1: Copy both files verbatim**

```bash
cp fe/src/lib/simpleToast.ts catatan-pengeluaran/lib/client/simple-toast.ts
cp fe/src/lib/expense-icons.ts catatan-pengeluaran/lib/client/expense-icons.ts
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/client/simple-toast.ts lib/client/expense-icons.ts
git commit -m "feat: port toast helper and expense-icon registry verbatim"
```

---

### Task 4: Client service layer (`lib/client/{login,expense-types,income-types,notes}.ts`)

**Files:**
- Create: `catatan-pengeluaran/lib/client/login.ts`
- Create: `catatan-pengeluaran/lib/client/expense-types.ts`
- Create: `catatan-pengeluaran/lib/client/income-types.ts`
- Create: `catatan-pengeluaran/lib/client/notes.ts`

**Interfaces:**
- Consumes: `apiFetch`, `getErrorMessage` (Task 2).
- Produces: `loginWithGoogle(credential)`, `listExpenseTypes()`, `createExpenseType(payload)`, `listIncomeTypes()`, `createIncomeType(payload)`, `createShoppingNote(payload)`, `listShoppingNotes(params?)`, `getShoppingNotesSummary(params?)`, `getShoppingNoteByID(id)`, `updateShoppingNote(id, payload)`, `deleteShoppingNote(id)`, `analyzeExpenses(payload)`. Used by Tasks 8, 9, 12, 13, 14, 15.

**Context:** ports `fe/src/service/{login,expense-types,income-types,notes}.ts`. Every function drops its `token: string` first parameter (Global Constraints) and its call to `authorizedFetch(path, init, token)` becomes `apiFetch(path, init)`. Request/response field names are unchanged from `fe/` — they already match the Phase 1 backend contract exactly.

- [ ] **Step 1: Write `lib/client/login.ts`**

```typescript
// lib/client/login.ts
import { apiFetch, getErrorMessage } from "./api";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function loginWithGoogle(credential: string): Promise<BackendUser> {
  if (!credential) {
    throw new Error("Credential Google tidak ditemukan");
  }

  const res = await apiFetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Terjadi kesalahan saat login dengan Google"),
    );
  }

  const data = (await res.json()) as { user: BackendUser };
  return data.user;
}
```

- [ ] **Step 2: Write `lib/client/expense-types.ts`**

```typescript
// lib/client/expense-types.ts
import { apiFetch, getErrorMessage } from "./api";

export type ExpenseType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function listExpenseTypes(): Promise<ExpenseType[]> {
  const res = await apiFetch("/expense-types", { method: "GET" });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal mengambil jenis pengeluaran"),
    );
  }

  return (await res.json()) as ExpenseType[];
}

export async function createExpenseType(payload: {
  label: string;
  icon: string;
}): Promise<ExpenseType> {
  const res = await apiFetch("/expense-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal membuat jenis pengeluaran"),
    );
  }

  return (await res.json()) as ExpenseType;
}
```

- [ ] **Step 3: Write `lib/client/income-types.ts`**

```typescript
// lib/client/income-types.ts
import { apiFetch, getErrorMessage } from "./api";

export type IncomeType = {
  id: string;
  label: string;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function listIncomeTypes(): Promise<IncomeType[]> {
  const res = await apiFetch("/income-types", { method: "GET" });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal mengambil jenis pemasukan"),
    );
  }

  return (await res.json()) as IncomeType[];
}

export async function createIncomeType(payload: {
  label: string;
  icon: string;
}): Promise<IncomeType> {
  const res = await apiFetch("/income-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Gagal membuat jenis pemasukan"),
    );
  }

  return (await res.json()) as IncomeType;
}
```

- [ ] **Step 4: Write `lib/client/notes.ts`**

```typescript
// lib/client/notes.ts
import { apiFetch, getErrorMessage } from "./api";

export type CreateShoppingNoteRequest = {
  tanggal: string;
  jumlah: number;
  jenis_transaksi: string;
  kategori_id: string;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
};

export type ShoppingNote = {
  id: string;
  user_id: string;
  jenis_transaksi: string;
  kategori_id: string;
  jumlah: number;
  nama_barang?: string;
  jumlah_barang?: number;
  catatan?: string;
  tanggal: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type ListNotesParams = {
  startDate?: string;
  endDate?: string;
  kategoriId?: string;
  jenisTransaksi?: string;
  page?: number;
  limit?: number;
};

export type ListNotesResult = {
  data: ShoppingNote[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
};

export type NotesSummaryItem = {
  kategori_id: string;
  kategori_label: string;
  icon: string;
  count: number;
  total: number;
};

export type NotesSummary = {
  total_count: number;
  total_amount: number;
  categories: NotesSummaryItem[];
};

export async function createShoppingNote(
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  const res = await apiFetch("/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menyimpan catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function listShoppingNotes(
  params: ListNotesParams = {},
): Promise<ListNotesResult> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.kategoriId) query.set("kategori_id", params.kategoriId);
  if (params.jenisTransaksi) query.set("jenis_transaksi", params.jenisTransaksi);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const res = await apiFetch(`/notes${qs ? `?${qs}` : ""}`, { method: "GET" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ListNotesResult;
}

export async function getShoppingNotesSummary(
  params: { startDate?: string; endDate?: string; jenisTransaksi?: string } = {},
): Promise<NotesSummary> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);
  if (params.jenisTransaksi) query.set("jenis_transaksi", params.jenisTransaksi);

  const qs = query.toString();
  const res = await apiFetch(`/notes/summary${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil laporan"));
  }

  return (await res.json()) as NotesSummary;
}

export async function getShoppingNoteByID(id: string): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, { method: "GET" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengambil catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function updateShoppingNote(
  id: string,
  payload: CreateShoppingNoteRequest,
): Promise<ShoppingNote> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal mengubah catatan"));
  }

  return (await res.json()) as ShoppingNote;
}

export async function deleteShoppingNote(id: string): Promise<void> {
  if (!id) throw new Error("ID catatan tidak valid");

  const res = await apiFetch(`/notes/${id}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menghapus catatan"));
  }
}

export type AnalyzePeriod = {
  start_date: string;
  end_date: string;
  total_count: number;
  total_amount: number;
  categories: Array<{ kategori_label: string; count: number; total: number }>;
};

export type AnalyzeRequest = {
  start_date: string;
  end_date: string;
  total_count: number;
  total_amount: number;
  categories: Array<{ kategori_label: string; count: number; total: number }>;
  user_name?: string;
  prev_period?: AnalyzePeriod;
  compare_type?: string;
  tx_type?: string;
  persona?: string;
};

export async function analyzeExpenses(payload: AnalyzeRequest): Promise<string> {
  const res = await apiFetch("/notes/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Gagal menganalisa data"));
  }

  const data = (await res.json()) as { analysis: string };
  return data.analysis;
}
```

- [ ] **Step 5: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/client/login.ts lib/client/expense-types.ts lib/client/income-types.ts lib/client/notes.ts
git commit -m "feat: port client service layer, drop token param (cookies replace it)"
```

---

### Task 5: `lib/client/auth-context.tsx`

**Files:**
- Create: `catatan-pengeluaran/lib/client/auth-context.tsx`

**Interfaces:**
- Produces: `AuthProvider`, `useAuth(): { user: AuthUser | null }`. Used by Task 11 (`app/(app)/layout.tsx`) and Task 15 (laporan components' `user_name`).

**Context:** replaces `fe/src/contexts/AuthProvider.tsx`. The old version hydrates `user` from localStorage in a `useEffect` after mount. The new version takes `user` as a required prop — it's resolved server-side once by `requireUser()` in `app/(app)/layout.tsx` and passed straight through, no client-side fetch or flash.

- [ ] **Step 1: Write the implementation**

```typescript
// lib/client/auth-context.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

const AuthContext = createContext<{ user: AuthUser | null } | undefined>(
  undefined,
);

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/client/auth-context.tsx
git commit -m "feat: add AuthProvider seeded from server-resolved user, no localStorage"
```

---

### Task 6: Global styling

**Files:**
- Modify: `catatan-pengeluaran/app/globals.css`
- Modify: `catatan-pengeluaran/app/layout.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the `--app-bg`/`--app-surface`/`--app-text`/`--app-text-muted`/`--app-border` CSS custom properties and the `dark` custom variant every later component's Tailwind classes rely on (`dark:bg-slate-900`, etc., work automatically via Tailwind v4's built-in dark handling, but the app's own `--app-*` tokens and the `html.dark`/`data-theme` toggle wiring used by Task 8's theme button come from this file).

- [ ] **Step 1: Replace `app/globals.css` with `fe/`'s stylesheet**

```bash
cp fe/src/assets/styles/style.css catatan-pengeluaran/app/globals.css
```

- [ ] **Step 2: Confirm the copied file has no `@`-aliased imports**

Run: `grep -n "^@import" catatan-pengeluaran/app/globals.css`
Expected: only `@import "tailwindcss";` — no other imports to fix.

- [ ] **Step 3: Update `app/layout.tsx` metadata (title/description) and body class**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pencatatan Pengeluaran",
  description: "Pencatatan Pengeluaran - AngelSuicide",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: port Tailwind v4 design tokens and dark-mode variant from fe/"
```

---

### Task 7: Dumb UI primitives (zero logic changes)

**Files:**
- Create: `catatan-pengeluaran/components/ui/amount-input.tsx`
- Create: `catatan-pengeluaran/components/ui/apple-date-picker.tsx`
- Create: `catatan-pengeluaran/components/ui/qty-picker.tsx`
- Create: `catatan-pengeluaran/components/dashboard/transaction-type-tabs.tsx`

**Interfaces:**
- Produces: `AmountInput`, `AppleDatePicker`, `QtyPicker` components; `TransactionTypeTabs` + `TransactionType` type. Used by Tasks 9, 13, 14, 15.

**Context:** confirmed via import-line grep that these four files import only from `react`/`react-dom`/`lucide-react` — no `@`-aliased imports at all, so they need `'use client'` added (Astro's `client:load` directive is gone; Next Client Components self-declare) but otherwise port byte-for-byte.

- [ ] **Step 1: Copy the three `ui/` primitives**

```bash
cp fe/src/components/ui/amount-input.tsx catatan-pengeluaran/components/ui/amount-input.tsx
cp fe/src/components/ui/apple-date-picker.tsx catatan-pengeluaran/components/ui/apple-date-picker.tsx
cp fe/src/components/ui/qty-picker.tsx catatan-pengeluaran/components/ui/qty-picker.tsx
```

- [ ] **Step 2: Copy `transaction-type-tabs.tsx`**

```bash
mkdir -p catatan-pengeluaran/components/dashboard
cp fe/src/components/modules/dashboard/transaction-type-tabs.tsx catatan-pengeluaran/components/dashboard/transaction-type-tabs.tsx
```

- [ ] **Step 3: Add `'use client'` as the first line of all four files**

For each of the four files copied above, insert `"use client";` followed by a blank line before the existing first line (the first `import`).

- [ ] **Step 4: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/amount-input.tsx components/ui/apple-date-picker.tsx components/ui/qty-picker.tsx components/dashboard/transaction-type-tabs.tsx
git commit -m "feat: port dumb UI primitives verbatim (amount-input, date-picker, qty-picker, tabs)"
```

---

### Task 8: Icon-consuming UI components

**Files:**
- Create: `catatan-pengeluaran/components/ui/expense-type-pills.tsx`
- Create: `catatan-pengeluaran/components/ui/add-expense-type-dialog.tsx`
- Create: `catatan-pengeluaran/components/ui/add-income-type-dialog.tsx`
- Create: `catatan-pengeluaran/components/ui/category-notes-modal.tsx`

**Interfaces:**
- Consumes: `getExpenseIcon` (Task 3), `ExpenseType`/`createExpenseType` (Task 4), `IncomeType`/`createIncomeType` (Task 4), `listShoppingNotes`/`ShoppingNote` (Task 4).
- Produces: `ExpenseTypePills`, `getExpenseTypeIcon`, `AddExpenseTypeDialog`, `AddIncomeTypeDialog`, `CategoryNotesModal`. Used by Tasks 9, 13, 14, 15.

**Context:** each needs only the import-path fixes from the Global Constraints table (`@/lib/expense-icons` → `@/lib/client/expense-icons`, `@/service/expense-types` → `@/lib/client/expense-types`, `@/service/income-types` → `@/lib/client/income-types`, `@/service/notes` → `@/lib/client/notes`, `@/components/ui/expense-type-pills` unchanged) plus `'use client'`. No auth/token logic in any of the four (confirmed — none import `auth-session` or take a `token` prop).

- [ ] **Step 1: Copy all four files**

```bash
cp fe/src/components/ui/expense-type-pills.tsx catatan-pengeluaran/components/ui/expense-type-pills.tsx
cp fe/src/components/ui/add-expense-type-dialog.tsx catatan-pengeluaran/components/ui/add-expense-type-dialog.tsx
cp fe/src/components/ui/add-income-type-dialog.tsx catatan-pengeluaran/components/ui/add-income-type-dialog.tsx
cp fe/src/components/ui/category-notes-modal.tsx catatan-pengeluaran/components/ui/category-notes-modal.tsx
```

- [ ] **Step 2: Add `'use client'` to the top of all four files**

- [ ] **Step 3: Fix import paths**

In `expense-type-pills.tsx`:
```
old: import { getExpenseIcon } from "@/lib/expense-icons";
     import type { ExpenseType } from "@/service/expense-types";
new: import { getExpenseIcon } from "@/lib/client/expense-icons";
     import type { ExpenseType } from "@/lib/client/expense-types";
```

In `add-expense-type-dialog.tsx`:
```
old: import { EXPENSE_ICONS } from "@/lib/expense-icons";
     import { createExpenseType, type ExpenseType } from "@/service/expense-types";
new: import { EXPENSE_ICONS } from "@/lib/client/expense-icons";
     import { createExpenseType, type ExpenseType } from "@/lib/client/expense-types";
```

In `add-income-type-dialog.tsx`:
```
old: import { EXPENSE_ICONS } from "@/lib/expense-icons";
     import { createIncomeType, type IncomeType } from "@/service/income-types";
new: import { EXPENSE_ICONS } from "@/lib/client/expense-icons";
     import { createIncomeType, type IncomeType } from "@/lib/client/income-types";
```

In `category-notes-modal.tsx`:
```
old: import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills";
     import { listShoppingNotes, type ShoppingNote } from "@/service/notes";
new: import { getExpenseTypeIcon } from "@/components/ui/expense-type-pills"; // unchanged
     import { listShoppingNotes, type ShoppingNote } from "@/lib/client/notes";
```

- [ ] **Step 4: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/expense-type-pills.tsx components/ui/add-expense-type-dialog.tsx components/ui/add-income-type-dialog.tsx components/ui/category-notes-modal.tsx
git commit -m "feat: port icon-consuming UI components with fixed import paths"
```

---

### Task 9: Receipt scanner and voice note (Gemini-backed entry points)

**Files:**
- Create: `catatan-pengeluaran/components/ui/receipt-scanner.tsx`
- Create: `catatan-pengeluaran/components/ui/voice-note.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `getErrorMessage` (Task 2), `ExpenseType` (Task 4), `AmountInput`/`AppleDatePicker`/`ExpenseTypePills`/`QtyPicker` (Tasks 7-8).
- Produces: `ReceiptScanner`, `VoiceNote`, `WizardSavePayload` type. Used by Task 13 (`pengeluaran-form.tsx`).

**Context:** both call `authorizedFetch("/scan-receipt", {...})` / `authorizedFetch("/voice-note", {...})` with no third `preferredToken` argument (confirmed by reading both call sites) — a pure rename to `apiFetch`, no signature juggling needed. `receipt-scanner.tsx` also imports `react-easy-crop` (Task 1 dependency).

- [ ] **Step 1: Copy both files**

```bash
cp fe/src/components/ui/receipt-scanner.tsx catatan-pengeluaran/components/ui/receipt-scanner.tsx
cp fe/src/components/ui/voice-note.tsx catatan-pengeluaran/components/ui/voice-note.tsx
```

- [ ] **Step 2: Add `'use client'` to the top of both files**

- [ ] **Step 3: Fix import paths in both files**

```
old: import { authorizedFetch, getErrorMessage } from "@/lib/api";
     import { type ExpenseType } from "@/service/expense-types";
     import { AmountInput } from "@components/ui/amount-input";
     import { AppleDatePicker } from "@components/ui/apple-date-picker";
     import { ExpenseTypePills } from "@components/ui/expense-type-pills";
     import { QtyPicker } from "@components/ui/qty-picker";
new: import { apiFetch, getErrorMessage } from "@/lib/client/api";
     import { type ExpenseType } from "@/lib/client/expense-types";
     import { AmountInput } from "@/components/ui/amount-input";
     import { AppleDatePicker } from "@/components/ui/apple-date-picker";
     import { ExpenseTypePills } from "@/components/ui/expense-type-pills";
     import { QtyPicker } from "@/components/ui/qty-picker";
```

`voice-note.tsx` additionally has `import { type WizardSavePayload } from "@components/ui/receipt-scanner";` → `@/components/ui/receipt-scanner"` (same sub-path fix).

- [ ] **Step 4: Rename every `authorizedFetch(` call to `apiFetch(` in both files**

Both call sites (`callScanReceipt` in `receipt-scanner.tsx`, `callVoiceNote` in `voice-note.tsx`) already pass only `(path, init)` — literally just the function name changes, arguments stay identical.

- [ ] **Step 5: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/receipt-scanner.tsx components/ui/voice-note.tsx
git commit -m "feat: port receipt-scanner and voice-note, apiFetch replaces authorizedFetch"
```

---

### Task 10: App shell (bottom nav, theme toggle, profile preview, logout)

**Files:**
- Create: `catatan-pengeluaran/components/app-shell.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 5).
- Produces: `AppShell` component (`{ user, children }` props). Used by Task 11 (`app/(app)/layout.tsx`).

**Context:** ports `fe/src/components/layouts/Layout.tsx`. Changes from the source (already read in full during spec research): drop the global stylesheet import (Task 6 imports it once, app-wide), drop the three `@/lib/auth-session` imports and the client-side `hasStoredAuth()`/`allowed`-state gate entirely (the parent Server Component in Task 11 already guarantees an authenticated user), take `user` as a prop instead of reading `getStoredUser()` in a `useEffect`, replace the manual-cookie-loop `handleLogout` with a call to `POST /api/auth/logout`, and switch nav `<a href>` to `next/link`'s `<Link>` with `usePathname()` replacing the `window.location.pathname` `useEffect`. The `title`/`description` props and their `document.title`-setting `useEffect` are dropped too — Next.js pages set metadata via a static `export const metadata` instead (added per-page in Tasks 12-16), which didn't exist as a concept in the old Astro-per-page `<Layout title="..." />` pattern.

- [ ] **Step 1: Write `components/app-shell.tsx`**

```typescript
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
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app-shell.tsx
git commit -m "feat: port app shell (nav, theme toggle, logout) with server-resolved user"
```

---

### Task 11: Auth-gated layout and 404 page

**Files:**
- Create: `catatan-pengeluaran/app/(app)/layout.tsx`
- Create: `catatan-pengeluaran/app/not-found.tsx`

**Interfaces:**
- Consumes: `requireUser`, `UnauthorizedError` (Phase 1's `lib/server/session.ts`), `AuthProvider` (Task 5), `AppShell` (Task 10).
- Produces: the auth gate every page under `(app)/` relies on (Tasks 13-16 — dashboard, list, laporan, profile; Task 12's `/login` is public and sits outside this route group).

- [ ] **Step 1: Write `app/(app)/layout.tsx`**

```typescript
// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/server/session";
import { AuthProvider } from "@/lib/client/auth-context";
import AppShell from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw err;
  }

  return (
    <AuthProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Write `app/not-found.tsx`**

`fe/src/pages/404.astro`'s actual content renders `MaintenancePage` (the snake/breakout minigame module) as its "not found" screen — not a real 404 message. Since Task-list Decisions drop the maintenance minigame entirely, that content has nothing left to port; write a plain, real not-found page instead (this is a forced consequence of the maintenance-drop decision, not a design change of its own):

```typescript
// app/not-found.tsx
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
```

- [ ] **Step 3: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/layout.tsx" app/not-found.tsx
git commit -m "feat: add server-side auth gate layout and 404 page"
```

---

### Task 12: Login page

**Files:**
- Create: `catatan-pengeluaran/components/login/login.tsx`
- Create: `catatan-pengeluaran/components/login/login-with-google-provider.tsx`
- Create: `catatan-pengeluaran/app/login/page.tsx`

**Interfaces:**
- Consumes: `loginWithGoogle` (Task 4), `requireUser`/`UnauthorizedError` (Phase 1).
- Produces: the `/login` route.

**Context:** ports `fe/src/components/modules/login/{login,login-with-google-provider}.tsx` + `fe/src/pages/index.astro`. Changes needed in `login.tsx`:
1. Drop `import { storeAuthSession } from "@/lib/auth-session";` — no longer needed, the server already set cookies.
2. `import { LoginWithGoogle } from "@/service/login";` → `import { loginWithGoogle } from "@/lib/client/login";` (also note the casing: `LoginWithGoogle` → `loginWithGoogle`, matching Task 4's export name).
3. `import { navigate } from "astro:transitions/client";` → `import { useRouter } from "next/navigation";`, and inside the component add `const router = useRouter();`.
4. In `onSuccessGoogle`: replace
   ```typescript
   const result = await LoginWithGoogle(credentialResponse.credential || "");
   storeAuthSession(result);
   navigate("/dashboard");
   ```
   with
   ```typescript
   await loginWithGoogle(credentialResponse.credential || "");
   router.push("/dashboard");
   ```
5. Everything else (theme toggle `useEffect`, JSX, Tailwind classes) is unchanged.

`login-with-google-provider.tsx` needs only the env var access fixed: `import.meta.env.PUBLIC_GOOGLE_CLIENT_ID` → `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` (already defined in `.env.local`/`.env` per Phase 1 setup).

`app/login/page.tsx` is a new Server Component replacing `pages/index.astro`'s inline localStorage-sniffing `<script>` with a server-side check: if `requireUser()` succeeds, redirect straight to `/dashboard`; otherwise render the login UI.

- [ ] **Step 1: Copy and edit `login.tsx`**

```bash
mkdir -p catatan-pengeluaran/components/login
cp fe/src/components/modules/login/login.tsx catatan-pengeluaran/components/login/login.tsx
```

Read the copied file, then apply the five changes from Context above. Add `"use client";` as the first line.

- [ ] **Step 2: Copy and edit `login-with-google-provider.tsx`**

```bash
cp fe/src/components/modules/login/login-with-google-provider.tsx catatan-pengeluaran/components/login/login-with-google-provider.tsx
```

Add `"use client";` as the first line. Change:
```
old: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID ||
new: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
```
Also fix the relative import: `import { LoginPage } from "./login";` stays as-is (same directory, unchanged).

- [ ] **Step 3: Write `app/login/page.tsx`**

```typescript
// app/login/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/server/session";
import { LoginWithGoogleProvider } from "@/components/login/login-with-google-provider";

export const metadata: Metadata = {
  title: "Login - Pencatatan Pengeluaran",
  description: "Pencatatan Pengeluaran - AngelSuicide",
};

export default async function LoginPage() {
  try {
    await requireUser();
    redirect("/dashboard");
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) {
      throw err;
    }
  }

  return <LoginWithGoogleProvider />;
}
```

- [ ] **Step 4: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/login app/login/page.tsx
git commit -m "feat: port login page, cookie-based Google sign-in, server-side redirect if authed"
```

---

### Task 13: Dashboard page

**Files:**
- Create: `catatan-pengeluaran/components/dashboard/dashboard.tsx`
- Create: `catatan-pengeluaran/components/dashboard/pemasukan-form.tsx`
- Create: `catatan-pengeluaran/components/dashboard/pengeluaran-form.tsx`
- Create: `catatan-pengeluaran/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `TransactionTypeTabs` (Task 7), `listIncomeTypes`/`listExpenseTypes`/`createShoppingNote` (Task 4), `AddIncomeTypeDialog`/`AddExpenseTypeDialog`/`AmountInput`/`AppleDatePicker`/`ExpenseTypePills`/`QtyPicker` (Tasks 7-8), `VoiceNote` (Task 9).
- Produces: the `/dashboard` route.

**Context:** all three files are in the Token-Removal set (Global Constraints). `dashboard.tsx`'s only job is deleting its `token` `useMemo` and the `token={token}` prop passes to its two children — read it (14 lines shown in research, short) and reproduce it without those two things. `pemasukan-form.tsx`/`pengeluaran-form.tsx` need both the import-path table AND the token-removal recipe applied.

- [ ] **Step 1: Copy all three files**

```bash
cp fe/src/components/modules/dashboard/dashboard.tsx catatan-pengeluaran/components/dashboard/dashboard.tsx
cp fe/src/components/modules/dashboard/pemasukan-form.tsx catatan-pengeluaran/components/dashboard/pemasukan-form.tsx
cp fe/src/components/modules/dashboard/pengeluaran-form.tsx catatan-pengeluaran/components/dashboard/pengeluaran-form.tsx
```

- [ ] **Step 2: Edit `dashboard.tsx`**

Add `"use client";` as the first line. Delete:
```typescript
  const token = useMemo(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  }, []);
```
and remove `token={token}` from both `<PengeluaranForm .../>` and `<PemasukanForm .../>`. Remove `useMemo` from the `react` import if `transactionType`'s `useState` is the only remaining hook needing it (check: it isn't used elsewhere in this file, so drop `useMemo` from the import, keep `useState`).

- [ ] **Step 3: Edit `pemasukan-form.tsx` and `pengeluaran-form.tsx`**

Add `"use client";` as the first line to both. Read each file in full, then for each:
1. Delete `import { hasStoredAuth } from "@/lib/auth-session";`.
2. Fix remaining imports per the Global Constraints table: `@/lib/simpleToast` → `@/lib/client/simple-toast`, `@/service/income-types`/`@/service/expense-types` → `@/lib/client/income-types`/`@/lib/client/expense-types`, `@/service/notes` → `@/lib/client/notes`, `@components/ui/X` → `@/components/ui/X` (four such imports each).
3. Remove `token: string;` from the `Props` type and `token` from the destructured component parameters (`{ token }` → `{}` or whatever sibling props remain).
4. Delete `const canRefreshSession = useMemo(() => hasStoredAuth(), []);`.
5. Delete the `if (!token && !canRefreshSession) return;` guard line inside the data-loading `useEffect`.
6. Remove `token` from the `useEffect`'s dependency array (`[canRefreshSession, token]` → `[]`, since `canRefreshSession` is also gone).
7. Remove `token` as the first argument from `listIncomeTypes(token)` / `listExpenseTypes(token)` → `listIncomeTypes()` / `listExpenseTypes()`, and from `createShoppingNote(token, {...})` → `createShoppingNote({...})` (every call site — `pengeluaran-form.tsx` has two `createShoppingNote(token, ...)` calls per the earlier grep, both need the arg dropped).
8. Remove `token={token}` from whatever child element it's passed to (line ~126/182 per the earlier grep — check what component receives it; if it's `VoiceNote` or similar, remove just that one prop, not the whole element).

- [ ] **Step 4: Write `app/(app)/dashboard/page.tsx`**

```typescript
// app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard - Pencatatan Pengeluaran",
};

export default function DashboardPage() {
  return <Dashboard />;
}
```

`dashboard.tsx` (Step 1's copy) exports `export const Dashboard = () => {...}` — a named export, matching the named import above.

- [ ] **Step 5: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard "app/(app)/dashboard/page.tsx"
git commit -m "feat: port dashboard page, drop token-prop threading"
```

---

### Task 14: List page

**Files:**
- Create: `catatan-pengeluaran/components/list/list.tsx`
- Create: `catatan-pengeluaran/components/list/list-pemasukan.tsx`
- Create: `catatan-pengeluaran/components/list/list-pengeluaran.tsx`
- Create: `catatan-pengeluaran/app/(app)/list/page.tsx`

**Interfaces:**
- Consumes: `TransactionTypeTabs` (Task 7), `AmountInput`/`AppleDatePicker`/`QtyPicker`/`ExpenseTypePills` (Tasks 7-8), `listIncomeTypes`/`listExpenseTypes` (Task 4), `listShoppingNotes`/`updateShoppingNote`/`deleteShoppingNote` (Task 4).
- Produces: the `/list` route.

**Context:** all three files are in the Token-Removal set. `list.tsx` follows the same recipe as `dashboard.tsx` (Task 13, Step 2) — delete the `token` `useMemo`, remove `token={token}` from both `<ListPengeluaranView .../>`/`<ListPemasukanView .../>` (keep `startDate`/`endDate` props, only drop `token`). `list-pemasukan.tsx`/`list-pengeluaran.tsx` follow the same per-file recipe as Task 13 Step 3, applied to their own service calls (`listIncomeTypes`/`listExpenseTypes`, plus whichever of `listShoppingNotes`/`updateShoppingNote`/`deleteShoppingNote` each file calls — read each file to find every call site, since the earlier grep only confirmed the `token`/`canRefreshSession` declaration lines, not every downstream usage).

- [ ] **Step 1: Copy all three files**

```bash
mkdir -p catatan-pengeluaran/components/list
cp fe/src/components/modules/list/list.tsx catatan-pengeluaran/components/list/list.tsx
cp fe/src/components/modules/list/list-pemasukan.tsx catatan-pengeluaran/components/list/list-pemasukan.tsx
cp fe/src/components/modules/list/list-pengeluaran.tsx catatan-pengeluaran/components/list/list-pengeluaran.tsx
```

- [ ] **Step 2: Edit `list.tsx`**

Add `"use client";` as the first line. Fix the one cross-module import:
```
old: import { TransactionTypeTabs, type TransactionType } from "@components/modules/dashboard/transaction-type-tabs";
new: import { TransactionTypeTabs, type TransactionType } from "@/components/dashboard/transaction-type-tabs";
```
Delete the `token` `useMemo` block (identical shape to Task 13 Step 2) and remove `token={token}` from both `<ListPengeluaranView .../>` and `<ListPemasukanView .../>` — keep their other props (`startDate`, `endDate`).

- [ ] **Step 3: Edit `list-pemasukan.tsx` and `list-pengeluaran.tsx`**

Add `"use client";` as the first line to both. Read each file in full, then for each:
1. Delete the `hasStoredAuth` import from `@/lib/auth-session`.
2. Fix remaining imports per the Global Constraints table (`@/components/ui/X` unchanged; `@/lib/simpleToast` → `@/lib/client/simple-toast`; `@/service/income-types`/`@/service/expense-types` → `@/lib/client/income-types`/`@/lib/client/expense-types`; any `@/service/notes` import → `@/lib/client/notes`).
3. Remove `token: string;` from the `Props` type and `token` from the destructured component parameters.
4. Delete `const canRefreshSession = useMemo(() => hasStoredAuth(), []);`.
5. Delete every `if (!token && !canRefreshSession) {...}` guard (the earlier grep found one inside a data-loading callback — check for others while reading the file in full).
6. Remove `token` from every `useCallback`/`useEffect` dependency array it appears in (the earlier grep found it in at least two: one `useCallback`, one `useEffect`).
7. Remove `token` as the first argument from every service call (`listIncomeTypes(token)`/`listExpenseTypes(token)`, and any `listShoppingNotes(token, ...)`/`updateShoppingNote(token, ...)`/`deleteShoppingNote(token, ...)` found while reading the file — these two files render the actual note list with inline edit/delete, so expect calls to more than just the type-listing function).

- [ ] **Step 4: Write `app/(app)/list/page.tsx`**

```typescript
// app/(app)/list/page.tsx
import type { Metadata } from "next";
import { ListNotesPage } from "@/components/list/list";

export const metadata: Metadata = {
  title: "List - Pencatatan Pengeluaran",
};

export default function ListPage() {
  return <ListNotesPage />;
}
```

(Match the export style exactly as found in the copied `list.tsx` — Step 1's source shows `export function ListNotesPage()`, a named export, so this named import is correct as written.)

- [ ] **Step 5: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/list "app/(app)/list/page.tsx"
git commit -m "feat: port list page, drop token-prop threading"
```

---

### Task 15: Laporan page

**Files:**
- Create: `catatan-pengeluaran/components/laporan/laporan.tsx`
- Create: `catatan-pengeluaran/components/laporan/laporan-pemasukan.tsx`
- Create: `catatan-pengeluaran/components/laporan/laporan-pengeluaran.tsx`
- Create: `catatan-pengeluaran/app/(app)/laporan/page.tsx`

**Interfaces:**
- Consumes: `TransactionTypeTabs` (Task 7), `CategoryNotesModal`/`getExpenseTypeIcon` (Task 8), `useAuth` (Task 5), `listShoppingNotes`/`getShoppingNotesSummary`/`analyzeExpenses` (Task 4).
- Produces: the `/laporan` route.

**Context:** same shape as Task 14, with one addition: `laporan-pemasukan.tsx`/`laporan-pengeluaran.tsx` also call `getStoredUser()?.name` (Global Constraints) — replace with `useAuth().user?.name` (add `import { useAuth } from "@/lib/client/auth-context";` and call the hook inside the component body).

- [ ] **Step 1: Copy all three files**

```bash
mkdir -p catatan-pengeluaran/components/laporan
cp fe/src/components/modules/laporan/laporan.tsx catatan-pengeluaran/components/laporan/laporan.tsx
cp fe/src/components/modules/laporan/laporan-pemasukan.tsx catatan-pengeluaran/components/laporan/laporan-pemasukan.tsx
cp fe/src/components/modules/laporan/laporan-pengeluaran.tsx catatan-pengeluaran/components/laporan/laporan-pengeluaran.tsx
```

- [ ] **Step 2: Edit `laporan.tsx`**

Add `"use client";` as the first line. Fix the cross-module import identically to Task 14 Step 2 (`@components/modules/dashboard/transaction-type-tabs` → `@/components/dashboard/transaction-type-tabs`). Delete the `token` `useMemo` block and remove `token={token}` from both `<LaporanPengeluaranView .../>`/`<LaporanPemasukanView .../>` (keep `startDate`/`endDate`).

- [ ] **Step 3: Edit `laporan-pemasukan.tsx` and `laporan-pengeluaran.tsx`**

Add `"use client";` as the first line to both. Read each file in full, then for each:
1. Delete `getStoredUser, hasStoredAuth` from the `@/lib/auth-session` import — the whole import line goes away.
2. Add `import { useAuth } from "@/lib/client/auth-context";` and, inside the component body, `const { user } = useAuth();`.
3. Fix remaining imports: `@/components/ui/category-notes-modal` and `@/components/ui/expense-type-pills` stay unchanged (same sub-path); `@/lib/simpleToast` → `@/lib/client/simple-toast`; whichever `@/service/notes` functions are imported → `@/lib/client/notes`.
4. Remove `token: string;` from `Props` and from the destructured parameters.
5. Delete `const canRefreshSession = useMemo(() => hasStoredAuth(), []);`.
6. Delete the `if (!token && !canRefreshSession) {...}` guard.
7. Replace `getStoredUser()?.name ?? undefined` with `user?.name ?? undefined`.
8. Remove `token` from the `useEffect` dependency array (`[startDate, endDate, canRefreshSession, token]` → `[startDate, endDate]`).
9. Remove `token` as the first argument from every service call found while reading the file (`listShoppingNotes`, `getShoppingNotesSummary`, `analyzeExpenses` at minimum, per the service modules these components clearly depend on for a report view).

- [ ] **Step 4: Write `app/(app)/laporan/page.tsx`**

```typescript
// app/(app)/laporan/page.tsx
import type { Metadata } from "next";
import { LaporanPage } from "@/components/laporan/laporan";

export const metadata: Metadata = {
  title: "Laporan - Pencatatan Pengeluaran",
};

export default function Laporan() {
  return <LaporanPage />;
}
```

(Match the export style exactly as found in the copied `laporan.tsx` — Step 1's source shows `export function LaporanPage()`, a named export, so this named import is correct as written.)

- [ ] **Step 5: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/laporan "app/(app)/laporan/page.tsx"
git commit -m "feat: port laporan page, drop token-prop threading, wire user_name to useAuth()"
```

---

### Task 16: Profile page (stub)

**Files:**
- Create: `catatan-pengeluaran/app/(app)/profile/page.tsx`

**Interfaces:**
- Consumes: nothing beyond the `(app)` layout's auth gate.

**Context:** `fe/src/pages/profile.astro` (confirmed by reading it in full) is a stub: `<main class="min-h-screen container-px py-8"><h1 class="text-2xl font-bold">Profil</h1></main>`, title "Profil", description "Profil Pengguna". Port it as-is — no expansion, per spec Non-goals. `container-px` is a real utility class (`fe/src/assets/styles/style.css:101-103`, `@apply px-2 sm:px-4 lg:px-8 xl:px-12;`) that Task 6 already ported verbatim into `app/globals.css`, so it keeps working unchanged — carry it over in the JSX below rather than dropping it.

- [ ] **Step 1: Write `app/(app)/profile/page.tsx`**

```typescript
// app/(app)/profile/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil - Pencatatan Pengeluaran",
  description: "Profil Pengguna",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen container-px py-8">
      <h1 className="text-2xl font-bold">Profil</h1>
    </main>
  );
}
```

- [ ] **Step 2: Sanity-check it compiles**

Run: `cd catatan-pengeluaran && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/profile/page.tsx"
git commit -m "feat: port profile page stub"
```

---

### Task 17: Manual verification pass (Phase 2 exit criteria)

**Files:** none created — this task runs the app and walks through every screen in a real browser.

**Context:** matches the spec's Testing Plan. Requires the Phase 1 `.env.local` values (already fixed: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`) and the Supabase schema already in place from Phase 1.

- [ ] **Step 1: Start the dev server and confirm a clean build**

Run: `cd catatan-pengeluaran && npm run dev`
Expected: starts on `http://localhost:3000` with no startup errors. Separately run `npx tsc --noEmit` — no type errors.

- [ ] **Step 2: `/login` → Google Sign-In → `/dashboard`**

Open `http://localhost:3000/login` in a browser, sign in with a real Google account, confirm redirect to `/dashboard` and that `document.cookie` (devtools) shows no readable `access_token`/`refresh_token` (they're httpOnly — confirms the cookie model is actually in effect, not a leftover localStorage token). Revisit `/login` while still signed in — expect an immediate server-side redirect back to `/dashboard`.

- [ ] **Step 3: Dashboard entry flows**

Add one pengeluaran entry and one pemasukan entry via the manual form; confirm both save without error. Try the receipt-scanner and voice-note entry points end-to-end (real Gemini calls) and confirm scanned/transcribed items populate the form.

- [ ] **Step 4: Type management**

Add a new expense type and a new income type via the inline "add" dialogs; confirm they appear in the pill selector immediately after creation.

- [ ] **Step 5: `/list`**

Confirm the entries from Step 3 appear, and that both the pengeluaran and pemasukan tabs render their respective lists. Edit one entry and delete another; confirm both operations persist after a page reload.

- [ ] **Step 6: `/laporan`**

Confirm summary totals match what was entered in Step 3. Trigger the Gemini-backed "analyze" call and confirm a persona-flavored response renders (matches Phase 1's already-verified `/api/notes/analyze` behavior, now driven from the UI).

- [ ] **Step 7: `/profile`**

Loads without error.

- [ ] **Step 8: Logout and re-gate check**

Click logout, confirm the confirmation dialog, confirm it redirects to `/login`. Then navigate directly to `http://localhost:3000/dashboard` — expect an immediate server-side redirect back to `/login` (proves the gate isn't relying on any stale client state).

- [ ] **Step 9: Theme toggle**

Toggle dark/light via the theme button; reload the page; confirm the choice persisted (backed by `localStorage["theme-preference"]`, unchanged from `fe/`).

- [ ] **Step 10: Production build**

Run: `cd catatan-pengeluaran && npm run build`
Expected: builds cleanly, no errors — confirms nothing in the port relies on a dev-only behavior.

- [ ] **Step 11: Commit any fixes found during this pass, then tag Phase 2 done**

```bash
git add -A
git commit -m "test: Phase 2 manual verification pass complete"
```
