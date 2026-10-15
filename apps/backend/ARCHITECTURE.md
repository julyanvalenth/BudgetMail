# Arsitektur Backend — Modular Monolith

Satu deployable API (`src/index.ts`) + satu proses worker (`src/workers/index.ts`),
dipisah per domain module supaya batas antar-domain jelas dan gampang dipecah jadi
service terpisah nanti kalau memang dibutuhkan.

```
src/
├── container.ts        ← composition root: SATU-SATUNYA tempat wiring dependency
├── app.ts              ← buildApp(container): Fastify + registrasi route plugins
├── index.ts            ← entry proses API
├── workers/index.ts    ← entry proses worker (BullMQ)
├── shared/             ← infra lintas-module: env, prisma, redis, crypto, jwt,
│                          kontrak queue, errors + errorHandler ({ error } JSON),
│                          month.ts (rentang bulan "YYYY-MM" dalam WIB)
├── testing/fakes.ts    ← repository in-memory untuk unit test service/route
└── modules/
    ├── auth/           ← Google login, session JWT, requireAuth, UserRepository
    ├── gmail-sync/     ← OAuth Gmail routes, GmailApiService, SyncService,
    │                      GmailConnection/SyncJob repositories, sync queue + worker
    ├── parsing/        ← Strategy pattern ekstraksi (strategies/), sender allowlist,
    │                      EmailParsingService, parsing queue + worker
    ├── categories/     ← CategoryRepository + GET/POST /categories (default global
    │                      di-seed di migration transactions_budgets, user_id NULL)
    ├── transactions/   ← TransactionRepository, TransactionService, CRUD /transactions
    ├── budgets/        ← BudgetRepository, BudgetService, /budgets (+ /budgets/copy),
    │                      computeBudgetProgress (pure)
    └── dashboard/      ← DashboardService, GET /dashboard/summary (read-only agregasi)
```

## Aturan dependensi

- Antar-module hanya boleh import lewat `index.ts` module tujuan (public API).
- Arah dependensi harus asiklik:
  `gmail-sync → parsing → {transactions, categories}`, `transactions → categories`,
  `dashboard → budgets → {transactions, categories}`. Semua module boleh → `auth` dan
  `shared`. `categories` paling bawah (tidak import module domain lain). `parsing` TIDAK boleh import dari `gmail-sync` —
  kontrak yang dibutuhkannya (`EmailFetcher`, `SyncProgressTracker`) didefinisikan
  di `parsing` sendiri dan dipenuhi secara struktural (dependency inversion).
- `shared/` tidak boleh import dari `modules/`.

## Pattern yang dipakai

- **Repository**: akses DB hanya lewat interface repository (`UserRepository`,
  `TransactionRepository`, dst) dengan implementasi `Prisma*Repository`. Tidak ada
  pemanggilan `prisma.*` di routes/services.
- **Dependency Injection**: semua service/route menerima dependensi via constructor /
  factory function; tidak ada singleton module-level (kecuali `env`). Wiring hanya
  di `container.ts`. Ini yang membuat `sync.service.test.ts` bisa jalan dengan fake
  in-memory tanpa Postgres/Redis/Gmail.
- **Strategy**: `TransactionExtractionStrategy` per pendekatan ekstraksi.
  `ExtractionStrategyResolver` memilih strategi berdasar sender (key = `id` di
  `senderAllowlist.ts`); default-nya `RuleBasedExtractionStrategy` (atau `ClaudeExtractionStrategy` bila `ANTHROPIC_API_KEY` diisi). Untuk tuning
  per bank, daftarkan strategi baru di map resolver lewat `container.ts`.
- **Factory**: `createContainer()`, `createPrismaClient()`, `createRedisConnection()`,
  `buildApp()`, `start*Worker()`.

## Invariant yang wajib dijaga (dari docs/TASKS.md & PRD)

- API dan worker tetap dua proses terpisah (`pnpm dev` vs `pnpm worker:dev`).
- `fetchEmail` tetap `format: "metadata"` — jangan pernah ambil body email penuh.
- Refresh token Gmail selalu AES-256-GCM terenkripsi sebelum masuk DB, tidak pernah ke log.
- Error dari Google API/gaxios di-log sebagai `errMessage` saja, tidak pernah objek mentah.
- Dedupe transaksi by `gmail_message_id`: cek eksplisit + unique constraint + catch P2002
  (di `PrismaTransactionRepository.createFromGmail`).
- Scope Gmail persis `gmail.readonly`, panggilan API read-only saja.
- `raw_snippet` hanya disimpan untuk transaksi `pending_review` dan dihapus (null) begitu
  transaksi dikonfirmasi atau diabaikan (retensi minimal, PRD §12).
- Transaksi dari Gmail tidak pernah di-hard-delete: DELETE mengubahnya jadi `ignored`
  supaya baris tetap jadi tombstone dedupe `gmail_message_id`.
- Semua route data user memakai hook `onRequest: requireAuth` (auth sebelum validasi
  body) dan setiap akses by-id lewat `findOwned(userId, id)` → 404 untuk milik user lain.
- Total dashboard & progres budget hanya menghitung transaksi `confirmed`.
