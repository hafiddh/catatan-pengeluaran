# Phase 1: Port Go backend to Next.js Route Handlers

## Context

App is being migrated off Astro (FE) + Go/Echo (BE) into a single Next.js
project (`catatan-pengeluaran`) so it deploys as one Vercel project. Full
migration is split into two independently-shippable phases:

- **Phase 1 (this spec)**: port all Go backend logic into Next.js Route
  Handlers. No UI work. Verified via `curl`/REST client against `next dev`.
- **Phase 2 (separate spec, later)**: port Astro pages/components to
  Next.js App Router + React, wired against the Phase 1 API.

This document covers Phase 1 only.

## Decisions

- **Full merge, no separate Go service.** Go backend retires once Phase 1
  ships. Single Vercel project, single deploy.
- **Database**: existing Supabase Postgres (schema already migrated from
  the old MySQL dump — see `catatan.supabase.sql` in the parent folder).
  Accessed via **transaction pooler** (port 6543), not a direct connection —
  required for serverless functions to avoid exhausting Postgres
  connections.
- **DB access**: raw `pg` (node-postgres) with hand-written SQL, one module
  per resource — mirrors the existing `be/internal/store/*.go` structure
  1:1. No ORM. Chosen over Drizzle/Supabase-js to minimize translation risk
  since the Go queries are already simple, parameterized SQL.
- **Auth**: httpOnly-cookie sessions verified via a small Data Access Layer
  (`lib/server/session.ts`), replacing the Go version's
  `Authorization: Bearer <token>` + localStorage pattern. Same-origin now
  (FE and API share one Next.js app), so the Go `frontend_guard`
  (Origin/Referer allow-list) and CORS middleware are **dropped
  entirely** — not needed when there's no cross-origin call.
- **This project's Next.js version (16.3.4) renamed Middleware to
  Proxy** — the file is `proxy.ts` at the project root, exported function
  named `proxy`, same `matcher` config shape. It does an *optimistic*
  cookie-presence + JWT-verify check only (mirrors Go's centralized
  `jwtAuth.RequireJWT` 401 gate). Per Next's own auth guide, Proxy should
  never be the only auth check — every protected Route Handler
  independently re-verifies the session via the DAL rather than trusting
  a value forwarded from Proxy.
- **Not using** Supabase Auth or `@supabase/supabase-js` / `@supabase/ssr`.
  Auth is custom (Google ID token verified server-side, our own HS256 JWT
  issued and stored in httpOnly cookies) — Supabase is only the Postgres
  host here.

## Architecture / file layout

```
proxy.ts                            # optimistic gate: verify access_token cookie, guard protected /api/* paths (Next 16's renamed Middleware)
lib/server/
  db.ts             # pg Pool singleton (uses DATABASE_URL, pooler mode)
  jwt.ts            # sign/verify access+refresh HS256 JWT, same claims shape as Go (user, token_type, iat, exp, sub)
  crypto.ts         # AES-256-GCM amount cipher, MUST be byte-compatible with Go's notecrypto (see Risks)
  google-auth.ts    # verify Google ID token via google-auth-library
  gemini.ts         # callGemini() with model-fallback list, ported 1:1 from gemini_client.go
  cookies.ts        # setAuthCookies() / clearAuthCookies(), Next's async cookies() API
  session.ts        # requireUser() DAL — each route handler calls this itself, doesn't trust proxy.ts alone
app/api/
  auth/google/route.ts       # POST
  auth/refresh/route.ts      # POST
  auth/logout/route.ts       # POST (new — didn't exist in Go, needed for cookie model)
  me/route.ts                 # GET
  expense-types/route.ts      # GET (list), POST (create)
  expense-types/[id]/route.ts # GET, PUT, DELETE
  income-types/route.ts       # GET (list), POST (create)
  income-types/[id]/route.ts  # GET, PUT, DELETE
  notes/route.ts               # GET (list, paginated), POST (create)
  notes/summary/route.ts       # GET
  notes/[id]/route.ts          # GET, PUT, DELETE
  notes/analyze/route.ts       # POST
  scan-receipt/route.ts        # POST
  voice-note/route.ts          # POST
  health/route.ts              # GET (kept for uptime checks)
```

## Auth flow

1. `POST /api/auth/google` — body `{ credential }` (Google ID token from
   the FE's Google Sign-In button). Verify via `google-auth-library`
   (`OAuth2Client.verifyIdToken`, equivalent to Go's `idtoken.Validate`).
   On success, issue access JWT (2h TTL) + refresh JWT (24h TTL), same
   claims shape as Go (`{ user: {id, email, name, picture}, token_type,
   sub, iat, exp }`, HS256, `JWT_SECRET`). Set both as httpOnly cookies:
   - `access_token`: path `/`, maxAge 2h
   - `refresh_token`: path `/api/auth`, maxAge 24h
   Both: `httpOnly`, `secure` (prod only), `sameSite=lax`.
   Response body: `{ user }` only — no token strings in JSON (cookie-based
   now, unlike Go which returned `access_token`/`refresh_token` in body).
2. `proxy.ts`'s `matcher` covers every protected `/api/*` path (not
   `/api/auth/*` or `/api/health`). Reads `access_token` cookie, verifies
   JWT. On failure: `401 { message: "JWT tidak valid" }` (same message
   text as Go, so any FE code checking that exact string still works).
   On success: lets the request through — it does **not** forward the
   decoded user via a header. Each protected Route Handler calls
   `requireUser()` from `lib/server/session.ts` itself, which re-reads
   and re-verifies the same cookie (cheap — pure JWT verify, no DB hit).
   This matches Next's documented guidance that Proxy is an optimistic
   pre-filter only, never the sole authorization check.
3. `POST /api/auth/refresh` — reads `refresh_token` cookie (no body
   needed, unlike Go which took it in JSON body — cookie replaces that).
   Verify, issue new pair, re-set both cookies.
4. `POST /api/auth/logout` — clears both cookies. New endpoint; Go never
   needed this since it was stateless Bearer tokens with no server-side
   cookie to clear.

## Data layer

- `lib/server/db.ts`: single `pg.Pool` (small max, e.g. 3 — serverless
  functions are short-lived, don't need a big pool per instance).
- Query modules (`expense-types.ts`, `income-types.ts`, `notes.ts` under
  `lib/server/`) port the Go `store/*.go` functions 1:1: same SQL, same
  soft-delete semantics (`deleted_at IS NULL` filtering, `UPDATE ...
  deleted_at = now()` instead of hard delete), same validation order.
- UUIDs: Go generated them via `SELECT UUID()` (a MySQL-ism). Postgres
  doesn't have that function — generate with Node's `crypto.randomUUID()`
  before insert instead of a DB round-trip. No behavior change (still a
  random v4 UUID string).
- Placeholder syntax changes from Go's `?` (MySQL driver) to Postgres's
  `$1, $2, ...` — mechanical translation per query.

## Risk: amount encryption compatibility

The `jumlah` (amount) column already contains AES-256-GCM ciphertext
produced by Go's `notecrypto.AmountCipher`:
- key = `SHA-256(NOTES_ENCRYPT_KEY)`
- nonce = random 12 bytes, prepended to the output
- Go's `aead.Seal(nil, nonce, plaintext, nil)` appends the 16-byte GCM tag
  to the end of the ciphertext automatically
- final encoding: `base64.RawStdEncoding` (standard alphabet, **no
  padding**) of `nonce || ciphertext || tag`

Node's `crypto.createCipheriv('aes-256-gcm', ...)` does **not** auto-append
the tag — it must be fetched via `cipher.getAuthTag()` and concatenated
manually to match this exact layout, and the base64 encode must have
padding stripped to match Go's `RawStdEncoding`. Getting this wrong means
every historical transaction amount becomes undecryptable.

**Before wiring this into any route**, write a standalone test that:
1. Takes a real encrypted `jumlah` value pulled from the live DB.
2. Decrypts it with the new Node implementation.
3. Confirms the plaintext is a sane integer (rupiah amount).
Also test the reverse: encrypt with Node, decrypt with a small Go snippet
(or just re-decrypt with the same Node code) to confirm round-trip.

## Endpoint contract

All endpoints below preserve the Go handlers' request/response JSON shapes,
field names, Bahasa Indonesia validation messages, and HTTP status codes
exactly, so Phase 2's FE `lib/api.ts` needs no contract changes beyond how
auth is delivered (cookies vs. manual Bearer header — Phase 2 concern).

Error shape (matches Echo's default JSON error body): `{ "message": "..." }`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/google | none (frontend-only, no JWT yet) | issues cookies |
| POST | /api/auth/refresh | refresh cookie | rotates cookies |
| POST | /api/auth/logout | access cookie | new, clears cookies |
| GET | /api/me | required | returns user from JWT claims |
| GET | /api/health | none | `{ ok: true }` |
| GET/POST | /api/expense-types | required | list / create |
| GET/PUT/DELETE | /api/expense-types/:id | required | get / update / soft-delete |
| GET/POST | /api/income-types | required | list / create |
| GET/PUT/DELETE | /api/income-types/:id | required | get / update / soft-delete |
| GET/POST | /api/notes | required | list (paginated, filters: start_date, end_date, kategori_id, jenis_transaksi) / create |
| GET | /api/notes/summary | required | aggregate, same filters minus pagination |
| GET/PUT/DELETE | /api/notes/:id | required | get / update / soft-delete |
| POST | /api/notes/analyze | required | Gemini free-text note parsing |
| POST | /api/scan-receipt | required | Gemini receipt image → line items, body `{ image_base64, mime_type }` |
| POST | /api/voice-note | required | Gemini voice transcript → structured note |

## Error handling & Vercel constraints

- Every route returns errors as `NextResponse.json({ message }, { status })`
  — never throw uncaught (Next would return its own HTML error page,
  breaking the FE's `message`-field parsing).
- Gemini calls: preserve the model-fallback loop (429/503 → try next model
  in the list) and the 200/502-on-failure behavior from `gemini_client.go`.
- Known inherited constraint (unchanged from Go): base64 image/audio
  payloads for scan-receipt/voice-note count against the request body —
  Vercel Route Handlers cap body size around 4.5MB on Hobby/Pro. Not a
  regression, just noting it's still a ceiling.
- Gemini calls with multi-model fallback can be slow; default Vercel
  function timeout (10s Hobby / configurable up to 60s+ on Pro) may need
  raising via `export const maxDuration` in those three routes.

## Testing plan

No existing Go tests to port. Order of verification for Phase 1:

1. **Crypto compatibility test** (highest risk, do first) — per the Risk
   section above, against a real DB value.
2. **JWT sign/verify round-trip test** — issue a token, verify it, confirm
   claims shape matches what Go produced (so any token issued during the
   transition period from either backend would decode the same way).
3. **Manual `curl` pass** against `next dev` for every route in the table
   above: happy path + at least one validation-error path per resource.
   Phase 1 isn't done until every row in the endpoint table has been hit
   and returns the expected shape/status.

## Non-goals (explicitly out of scope for this phase)

- Any UI/page work (Phase 2).
- Changing the DB schema beyond what's already in `catatan.supabase.sql`.
- Rate limiting, request logging/observability, or other hardening not
  present in the Go version — parity port only, no scope creep.
