# Phase 2: Port Astro Frontend to Next.js App Router

## Context

Phase 1 (`docs/superpowers/specs/2026-09-09-phase1-backend-port-design.md`,
shipped on branch `feat/phase1-backend-port`) ported the Go/Echo backend
into Next.js Route Handlers under `catatan-pengeluaran/app/api/`, using
httpOnly-cookie JWT sessions instead of Go's `Authorization: Bearer`
scheme. All endpoint request/response shapes were preserved byte-for-byte
from Go.

Phase 2 (this spec) ports the old Astro + React frontend (`fe/`) into
`catatan-pengeluaran/app/`, so the whole product — UI and API — is one
Next.js project, one Vercel deploy. `fe/`, `be/`, `nginx/`, and
`docker-compose.yml` are **not deleted** by this phase; they stay as
reference until the ported app is confirmed working, and retiring them is
a separate decision made later, not part of this task.

## Decisions

- **1:1 behavioral port, no redesign.** Every page, component, and
  interaction in `fe/` is reproduced as-is in the new app. The only things
  allowed to change are the mechanics forced by the framework/auth switch
  (Astro → Next.js App Router, bearer-token-in-localStorage → httpOnly
  cookies). No new features, no visual redesign, no dropped components
  except the one explicit exception below.
- **`maintenance.astro` (snake/breakout minigame easter egg, ~600 LOC) is
  dropped**, not ported. It's not core product functionality. Can be
  revisited later if actually wanted.
- **Auth gating is server-side.** A Server Component layout at
  `app/(app)/layout.tsx` calls `requireUser()` (from Phase 1's
  `lib/server/session.ts`) directly — no HTTP round-trip, no client-side
  flash of protected content before redirecting unauthenticated users to
  `/login`. This replaces `fe/`'s client-side `hasStoredAuth()` check
  (`Layout.tsx:140-155`) and the inline localStorage-sniffing `<script>`
  in `pages/index.astro:7-18`.
- **Cookie-based fetch, not Bearer tokens.** All client-side API calls
  switch to `fetch(..., { credentials: 'include' })` and drop the
  `Authorization` header entirely — the new backend's `requireUser()`
  only ever reads the `access_token` cookie (see Phase 1 spec,
  `lib/server/session.ts`). `fe/src/lib/auth-session.ts` (localStorage
  token storage) and the `Authorization`-header logic in
  `fe/src/lib/api.ts` are **not ported**; they're replaced by the design
  in "Client auth & API layer" below.
- **No new global state library.** `fe/` has no Redux/Zustand — just
  component-local `useState`/`useEffect` and one trivial `AuthProvider`
  context. Same approach carries over: a thin `AuthProvider` seeded from
  the server-resolved user (passed down from `(app)/layout.tsx`), no new
  dependency.
- **Styling ports verbatim.** `fe/src/assets/styles/style.css` (299
  lines — Tailwind v4 `@import`, one `@custom-variant dark`, a handful of
  CSS custom properties for light/dark tokens) replaces the
  `create-next-app` boilerplate in `catatan-pengeluaran/app/globals.css`.
  No token redesign.
- **Components are Client Components.** `fe/`'s 27 `.tsx` files are
  already plain React with `useState`/`useEffect`/`fetch` — no
  Astro-specific syntax inside them. They port with `'use client'` added
  and import paths adjusted, not rewritten as Server Components. Only the
  new `(app)/layout.tsx` (auth gate) and thin page-level wrapper files are
  Server Components.
- **Routing**: Next.js App Router file-based routing replaces Astro's.
  Paths stay identical (`/dashboard`, `/list`, `/laporan`, `/profile`,
  `/login` in place of `/`) so nothing else in this spec needs a URL
  remap. Internal navigation switches from `<a href>`/`astro:transitions`
  `navigate()` to `next/link`'s `<Link>` (client-side transitions, no
  full page reload — this is a forced-by-framework change, not a
  redesign).

## Architecture / file layout

```
app/
  login/
    page.tsx                    # public. Google Sign-In button. Redirects to /dashboard if already authed (server check).
  (app)/
    layout.tsx                  # Server Component. requireUser() -> redirect('/login') on failure. Renders <AppShell user={user}>{children}</AppShell>.
    dashboard/page.tsx
    list/page.tsx
    laporan/page.tsx
    profile/page.tsx
  globals.css                   # replaced with ported fe/src/assets/styles/style.css content
  layout.tsx                    # root layout: <html>/<body>, fonts, metadata (kept from scaffold, title/description updated)
  not-found.tsx                 # ports fe/src/pages/404.astro

components/
  app-shell.tsx                 # ports fe/src/components/layouts/Layout.tsx (bottom nav, theme toggle, profile preview, logout confirm). Client Component. Takes `user` as a prop instead of reading localStorage.
  dashboard/
    dashboard.tsx
    pemasukan-form.tsx
    pengeluaran-form.tsx
    transaction-type-tabs.tsx
  laporan/
    laporan.tsx
    laporan-pemasukan.tsx
    laporan-pengeluaran.tsx
  list/
    list.tsx
    list-pemasukan.tsx
    list-pengeluaran.tsx
  login/
    login.tsx                   # ports fe/src/components/modules/login/login.tsx
  ui/
    add-expense-type-dialog.tsx
    add-income-type-dialog.tsx
    amount-input.tsx
    apple-date-picker.tsx
    category-notes-modal.tsx
    expense-type-pills.tsx
    qty-picker.tsx
    receipt-scanner.tsx
    voice-note.tsx

lib/
  server/                       # unchanged from Phase 1
  client/                       # new — browser-side code, parallel to lib/server/
    api.ts                      # fetch wrapper: credentials:'include', 401 -> one refresh attempt -> retry -> redirect /login on repeat failure
    auth-context.tsx            # AuthProvider/useAuth, seeded from a `user` prop (no localStorage)
    expense-types.ts
    income-types.ts
    notes.ts
    login.ts                    # LoginWithGoogle(credential) -> POST /api/auth/google
    expense-icons.ts            # ports fe/src/lib/expense-icons.ts verbatim
    simple-toast.ts             # ports fe/src/lib/simpleToast.ts verbatim
```

Files intentionally **not** ported: `fe/src/lib/auth-session.ts`,
`fe/src/components/modules/maintenance/*` (4 files), `fe/src/pages/maintenance.astro`,
`fe/src/components/layouts/Layout.astro` (Astro-only HTML shell, superseded
by `app/layout.tsx`). Also **not** ported because they're dead code — never
imported by any real page or component (confirmed via repo-wide grep) —
and reference at least one nonexistent file (`dialog.astro` imports
`@/components/layouts/LayoutPrivate.astro`, which does not exist):
`fe/src/components/ui/button.astro`, `card.astro`, `dialog.astro`,
`input.astro`, `fe/src/libs/cn.ts`. The real app builds all UI directly
with Tailwind utility classes on plain elements (see `Layout.tsx`'s
`<button>`/`<nav>` usage) — that pattern is what actually gets ported.

## Auth flow

1. **`/login`** (Server Component wrapper + `components/login/login.tsx`
   Client Component): renders `GoogleOAuthProvider` +
   `@react-oauth/google`'s login button (unchanged from `fe/`, same
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var already defined in
   `.env.local.example`). On success, calls `lib/client/login.ts`'s
   `loginWithGoogle(credential)`, which `POST /api/auth/google` with
   `credentials: 'include'`. The response body is now `{ user }` only
   (Phase 1 changed this — no more `access_token`/`refresh_token`/`token`
   fields to store). On success: `router.push('/dashboard')` (no
   localStorage write — the server already set the httpOnly cookies).
   Server wrapper: if `requireUser()` already succeeds (cookie present
   and valid), redirect straight to `/dashboard` without rendering the
   login button — replaces the inline `<script>` token-sniff in the old
   `pages/index.astro`.
2. **`app/(app)/layout.tsx`**: `const user = await requireUser()` wrapped
   in try/catch; `UnauthorizedError` → `redirect('/login')`. On success,
   renders `<AppShell user={user}>{children}</AppShell>` — every route
   under `(app)/` is gated by this one layout, so individual pages need
   no auth code of their own.
3. **`lib/client/api.ts`** (used by every service module under
   `lib/client/`): every call sets `credentials: 'include'`, no
   `Authorization` header. On a `401` response whose body's `message` is
   `"JWT tidak valid"`, call `POST /api/auth/refresh` once (no body — the
   backend reads the `refresh_token` cookie itself), then retry the
   original request once. If the retry also 401s, or the refresh call
   itself fails, do a hard redirect to `/login` (`window.location.href`,
   matching the old behavior of dropping the user back at login on an
   unrecoverable auth failure — simpler and safer here than trying to
   thread a router instance through a plain fetch wrapper).
4. **Logout**: the "Ya, keluar" button in `AppShell` calls
   `POST /api/auth/logout`, then navigates to `/login`. Replaces the old
   `handleLogout` in `Layout.tsx:108-138`, which manually looped over
   `document.cookie` trying to expire everything — that approach cannot
   clear httpOnly cookies and is deleted outright, not adapted.

## Client auth & API layer

`lib/client/auth-context.tsx` replaces `fe/src/contexts/AuthProvider.tsx`:
same shape (`{ user }`, a `useAuth()` hook), but the Provider takes
`user` as a prop from the server (passed down from `(app)/layout.tsx`
through `AppShell`) instead of reading `getStoredUser()` from
localStorage in a `useEffect`. `/login` has no `AuthProvider` around it
(no user yet).

`lib/client/api.ts` replaces `fe/src/lib/api.ts` + `auth-session.ts`.
Shape (new):

```ts
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response>
export async function getErrorMessage(response: Response, fallback: string): Promise<string> // ported verbatim, no changes needed
```

`apiFetch` internally does the credentials-include + 401-refresh-retry
dance from step 3 above. Every service module (`notes.ts`,
`expense-types.ts`, `income-types.ts`) is a near-verbatim port of its
`fe/src/service/*.ts` counterpart — per the Phase 1 endpoint contract,
every request body field name, query param, and response shape already
matches (`jenis_transaksi`, `kategori_id`, `nama_barang`, `jumlah_barang`,
`has_next`, `{ data, total, page, limit, has_next }` for list, etc.) — the
only edit in each service file is swapping the old `authorizedFetch` /
`API_BASE_URL`-prefixed `fetch` calls for `apiFetch` (which itself points
at same-origin `/api/...`, no base URL env var needed anymore since FE
and API now share one origin).

`login.ts`'s `loginWithGoogle()` return type shrinks from
`BackendGoogleLoginResponse` (`token`, `access_token`, `refresh_token`,
`token_type`, `expires_in`, `refresh_expires_in`, `user`) to just
`{ user: AuthUser }`, matching Phase 1's `app/api/auth/google/route.ts`.

## Page-by-page port map

| Old (`fe/src/pages/`) | New (`catatan-pengeluaran/app/`) | Notes |
|---|---|---|
| `index.astro` | `login/page.tsx` | Server wrapper redirects to `/dashboard` if already authed; renders `components/login/login.tsx` otherwise |
| `dashboard/index.astro` | `(app)/dashboard/page.tsx` | renders `components/dashboard/dashboard.tsx` (tabs, add-entry forms, receipt-scan/voice-note entry points) |
| `list.astro` | `(app)/list/page.tsx` | renders `components/list/list.tsx` |
| `laporan.astro` | `(app)/laporan/page.tsx` | renders `components/laporan/laporan.tsx` |
| `profile.astro` | `(app)/profile/page.tsx` | currently a stub (`<h1>Profil</h1>`) in `fe/` too — ported as-is, not expanded |
| `maintenance.astro` | — dropped | see Decisions |
| `404.astro` | `app/not-found.tsx` | Next.js convention file, auto-rendered on unmatched routes. **Note**: the old file's actual content rendered `MaintenancePage` (the dropped minigame), not a real "not found" message — the new page is a plain not-found screen instead, since there's no other authentic content to port |

`components/layouts/Layout.tsx`'s bottom nav (`Dashboard`/`List`/
`Laporan`/`Logout` + profile-photo button) ports into
`components/app-shell.tsx`, rendered once by `(app)/layout.tsx` — not
duplicated per page. Nav links switch to `next/link`; active-route
detection switches from `window.location.pathname` (client-only,
`useEffect`) to `usePathname()` from `next/navigation`.

## Error handling

- `apiFetch` 401-then-refresh-then-redirect behavior as described above —
  ports the old `authorizedFetch` retry logic (`fe/src/lib/api.ts:90-122`)
  with cookies substituted for the Bearer token.
- `(app)/layout.tsx`: `UnauthorizedError` → `redirect('/login')` (Next's
  `redirect()` throws internally and is handled by the framework — this
  is the standard App Router pattern, not a try/catch-and-render-error
  page).
- Component-level error/toast handling (`simpleToast.ts`,
  inline error states in forms/dialogs) ports unchanged — these already
  operate on `Error` objects / message strings from the service layer,
  which keep the same shape.

## Testing plan

`fe/` has no automated UI tests today (Astro project, no test files) —
Phase 2 does not introduce a new test framework for the UI, matching
existing project convention. `lib/server/*.test.ts` (Phase 1's backend
unit tests) are untouched and unaffected by this phase.

Acceptance is a manual browser walkthrough against `next dev`, mirroring
Phase 1's Task 18 structure:

1. `/login` → Google Sign-In → redirected to `/dashboard`, cookies set,
   revisiting `/login` while authed redirects straight to `/dashboard`.
2. Dashboard: add a pengeluaran entry and a pemasukan entry (manual form),
   confirm they appear; try the receipt-scanner and voice-note entry
   points end-to-end against the real Gemini-backed routes.
3. Add a new expense type and income type via the inline dialogs.
4. `/list`: entries from step 2 appear, pengeluaran/pemasukan tabs both
   work.
5. `/laporan`: summary totals match what was entered; trigger the
   Gemini-backed analyze call and confirm a persona-flavored response
   renders.
6. `/profile`: loads without error (stub content, same as `fe/`).
7. Logout: clears session, redirects to `/login`; `/dashboard` visited
   directly afterward redirects back to `/login` (server-side gate,
   confirms no stale client state grants access).
8. Theme toggle (light/dark) persists across a reload.
9. `npm run build && npx tsc --noEmit` clean — no type errors, no build
   failures — before calling Phase 2 done.

## Non-goals (explicitly out of scope for this phase)

- Any visual/UX redesign — pure port.
- The maintenance-mode minigame (dropped, see Decisions).
- Expanding `/profile` beyond its current stub.
- Deleting or archiving `fe/`, `be/`, `nginx/`, `docker-compose.yml` —
  left in place as reference; retiring them is a separate future decision.
- New automated UI test coverage — matches `fe/`'s existing (lack of)
  convention.
- Any backend/API changes — Phase 1's routes are consumed as-is.
