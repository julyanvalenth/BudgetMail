# TASKS — Implementation Plan untuk Claude Code

> Cara pakai: berikan `PRD.md` sebagai context di awal sesi Claude Code, lalu minta Claude Code mengerjakan file ini **fase per fase** (jangan sekaligus semua fase dalam satu sesi besar). Setiap fase punya "Definition of Done" — cek itu sebelum lanjut ke fase berikutnya.

**Stack yang dipakai (rujuk PRD.md §6):**
- Backend: TypeScript, Fastify, Prisma, PostgreSQL, BullMQ + Redis
- Mobile: TypeScript, React Native + Expo
- Auth: Google OAuth2 (incremental scope untuk Gmail)
- Parsing: LLM-based extraction (Claude API)
- Monorepo disarankan (mis. dengan pnpm workspaces / Turborepo) supaya backend dan mobile bisa share package `types/`

---

## Fase 0 — Project Setup

- [x] Inisialisasi monorepo (`apps/backend`, `apps/mobile`, `packages/shared-types`) menggunakan pnpm workspaces
- [x] Setup `apps/backend`: Fastify + TypeScript. Struktur awal (`src/routes`, `src/services`, `src/workers`, `src/lib`) telah direfactor (Juli 2026) menjadi modular monolith: `src/modules/{auth,gmail-sync,parsing,transactions}` + `src/shared` + composition root `src/container.ts` — repository pattern (interface + implementasi Prisma), dependency injection via constructor, Strategy pattern untuk ekstraksi per provider. Lihat `apps/backend/ARCHITECTURE.md`.
- [x] Setup Prisma, koneksi ke PostgreSQL lokal (docker-compose: postgres + redis untuk dev) — **update Okt 2026:** Docker sudah terpasang, `docker compose up -d` jalan, dan kedua migration (`init`, `transactions_budgets`) sudah ter-apply ke Postgres lokal (port 5434)
- [x] Setup `apps/mobile`: Expo + TypeScript, struktur folder (expo-router root ada di `src/app` — konvensi resmi Expo Router untuk project yang pakai `src/`, setara dengan `app/`; `src/api`, `src/components`, `src/hooks` sudah ada)
- [x] Setup `packages/shared-types`: definisikan tipe `Transaction`, `Category`, `Budget`, `User` yang dipakai bersama backend & mobile
- [x] Setup environment variables (`.env.example` untuk backend: `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `TOKEN_ENCRYPTION_KEY`)
- [x] Setup linting/formatting (ESLint + Prettier) di seluruh monorepo
- [ ] Buat Google Cloud Project + OAuth consent screen (status: **Testing**), catat Client ID & Secret di `.env`
      — **MANUAL, belum dikerjakan agent** (butuh akses browser/akun Google). Checklist:
      1. Buat project baru di console.cloud.google.com (mis. "BudgetMail Dev")
      2. Enable **Gmail API** di APIs & Services → Library
      3. APIs & Services → OAuth consent screen → pilih **External**, isi nama app & support email, publishing status **Testing**
      4. Di "Test users", tambahkan `kitaorangsukses12345@gmail.com`
      5. APIs & Services → Credentials → Create Credentials → OAuth client ID (Web application); redirect URI diisi saat endpoint callback dibuat di Fase 1
      6. Salin Client ID & Client Secret ke `apps/backend/.env` (bukan `.env.example`)

**Definition of Done:** `pnpm dev` menjalankan backend (health check endpoint `/health` return 200) dan mobile app (Expo) bisa dibuka di simulator, tanpa fitur bisnis apapun.

**Status:** Terverifikasi — `pnpm dev` menjalankan backend & mobile bersamaan, `/health` return 200, Metro bundler jalan bersih (`http://localhost:8081/status` → 200). Tidak ada simulator iOS/Android di environment ini, jadi "dibuka di simulator" belum diverifikasi secara visual — batas verifikasi yang bisa dilakukan agent adalah bundler start bersih tanpa error.

---

## Fase 1 — Auth & Koneksi Gmail

### Backend
- [x] Model Prisma: `User`, `GmailConnection` (lihat skema di PRD §10)
- [x] Endpoint `POST /auth/google` — terima Google ID token dari mobile, verifikasi, create/find user, return JWT session
- [x] Endpoint `GET /auth/me` — return user yang sedang login (dari JWT)
- [x] Endpoint `POST /gmail/connect` — generate OAuth URL untuk incremental scope `https://www.googleapis.com/auth/gmail.readonly`, redirect/callback menyimpan refresh_token **terenkripsi** (gunakan `TOKEN_ENCRYPTION_KEY`, jangan simpan plaintext)
- [x] Endpoint `GET /gmail/status` — return status koneksi (`connected` / `not_connected` / `token_expired`)
- [x] Endpoint `DELETE /gmail/disconnect` — revoke token di Google + hapus dari DB
- [x] Middleware auth (verifikasi JWT di setiap route yang butuh login)

### Mobile
- [x] Layar login: tombol "Login dengan Google" (pakai `expo-auth-session` — `@react-native-google-signin/google-signin` butuh custom dev client/native build, tidak kompatibel dengan Expo Go polos yang kita pakai di Fase 0)
- [x] Simpan JWT session (secure storage via `expo-secure-store`, lewat `AuthProvider` context di `src/hooks/use-auth.tsx`)
- [x] Layar onboarding: penjelasan izin Gmail yang akan diminta (transparansi ke user) + tombol "Hubungkan Gmail"
- [x] Handle deep link callback setelah user approve consent screen Google (`budgetmail://gmail-connected` → `src/app/gmail-connected.tsx`)

**Definition of Done:** User bisa login dengan akun Google dari mobile app, lalu menghubungkan Gmail, dan status koneksi "connected" tersimpan di database dengan token terenkripsi.

**Status:** Kode lengkap dan lolos verifikasi statis (typecheck + lint + `pnpm --filter backend test`, 10/10 test unit untuk enkripsi token & JWT session/state). **Verifikasi end-to-end live belum bisa dilakukan** karena dua hal masih pending di luar kendali agent ini:
1. Google Cloud OAuth consent screen + Client ID/Secret (langkah manual Fase 0 — lihat checklist di bagian Fase 0) belum dibuat, jadi `POST /auth/google` dan alur `/gmail/connect` belum bisa dites melawan Google beneran.
2. Docker belum terpasang di mesin ini, jadi Postgres/Redis lokal belum pernah dijalankan — `prisma migrate dev` untuk model `User`/`GmailConnection` belum pernah dieksekusi ke database nyata (schema sudah benar dan `prisma generate` sudah berhasil tanpa DB live).

Setelah kedua prasyarat itu selesai (install Docker Desktop + `docker compose up -d`, lalu isi `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`TOKEN_ENCRYPTION_KEY` di `apps/backend/.env`), jalankan `pnpm --filter @budgetmail/backend exec prisma migrate dev --name init` lalu uji alur login + connect Gmail dari HP/emulator sungguhan untuk verifikasi end-to-end.

**Catatan review keamanan:** subagent kustom `gmail-security-reviewer` tidak ter-load di sesi ini (baru dipindah dari `sesi/.claude/agents` ke `.claude/agents` di sesi yang sama — kemungkinan perlu restart sesi Claude Code agar terdeteksi). Sebagai gantinya, review checklist yang sama dilakukan manual: refresh token terenkripsi AES-256-GCM sebelum masuk DB (`src/lib/crypto.ts`), scope persis `gmail.readonly`, semua endpoint data user/Gmail di belakang JWT middleware, revoke token Google benar-benar dipanggil saat disconnect, tidak ada raw SQL. Satu temuan Critical ditemukan & diperbaiki: `request.log.error/warn({ err }, ...)` di `routes/gmail.ts` dan `routes/auth.ts` berisiko membocorkan `GOOGLE_CLIENT_SECRET`/refresh token plaintext ke log lewat objek error gaxios yang menyertakan request config — sudah diganti jadi log pesan saja (`errMessage`). **Jalankan ulang `gmail-security-reviewer` di sesi baru** untuk verifikasi independen begitu subagent-nya ter-load.

---

## Fase 2 — Sync & Parsing Pipeline

### Backend — Sync Worker
- [x] Buat queue `gmail-sync` (BullMQ) dan worker terpisah (kontrak queue di `src/shared/queues.ts`, producer di `src/modules/gmail-sync/sync.queue.ts`, worker di `src/modules/gmail-sync/gmailSync.worker.ts`; dijalankan via `pnpm --filter backend worker:dev` sebagai proses terpisah dari API)
- [x] Config sender allowlist awal (`src/modules/parsing/senderAllowlist.ts`) — **catatan akurasi:** riset web tidak menemukan alamat pengirim notifikasi transaksi yang presisi/terverifikasi untuk provider manapun (hanya alamat CS/marketing umum ditemukan), jadi list ini berbasis **domain perusahaan** dengan label `confidence: "domain_confirmed"` (BCA, via klikbca.com — dikonfirmasi lewat pencarian) vs `"unverified"` (Mandiri/BRI/BNI/GoPay/OVO/DANA/ShopeePay — domain resmi perusahaan, tapi alamat pengirim notifikasi spesifiknya belum terverifikasi). **Wajib divalidasi terhadap sampel inbox asli sebelum dipakai produksi** — ini persis Open Question yang sudah ditandai di PRD §12.
- [x] Fungsi `fetchNewEmails(userId)` — diimplementasikan sebagai `SyncService.runGmailSync()` (`src/modules/gmail-sync/sync.service.ts`) yang memanggil `listAllowlistedMessageIds` + `fetchEmail` (`src/modules/gmail-sync/gmailApi.service.ts`):
  - Query `users.messages.list` dengan `from:(...)` (dari allowlist) + `after:{lastSyncedAt}` ✓
  - `users.messages.get` pakai `format: "metadata"` (bukan `"full"`) — hanya ambil header From/Date + `snippet` bawaan Gmail (preview pendek), **tidak pernah menyimpan body email penuh** — sengaja diselaraskan dengan prinsip retensi minimal di PRD §12
- [x] Repeatable job setiap 30 menit per user connected (`scheduleIncrementalSync` via BullMQ Job Scheduler, di-upsert saat `/gmail/callback` sukses, dihapus saat `/gmail/disconnect`)
- [x] Endpoint `POST /gmail/sync` — trigger manual sync
- [x] Job backfill awal (3 bulan, sekali, terpisah dari repeatable job) — `enqueueBackfillSync`, dipicu otomatis setelah `/gmail/callback` sukses
- [x] Handle token expired gracefully — `GmailTokenExpiredError` di-catch di `runGmailSync`, update `GmailConnection.syncStatus` jadi `token_expired` + `SyncJob.status` jadi `failed`, worker process tidak crash

### Backend — Parsing Worker
- [x] Buat queue `transaction-parsing`, terpisah dari sync (satu job per email) (worker di `src/modules/parsing/parsing.worker.ts`, logika job di `EmailParsingService`, `src/modules/parsing/emailParsing.service.ts`)
- [x] Fungsi ekstraksi transaksi — **update Juli 2026:** default sekarang `RuleBasedExtractionStrategy` (`src/modules/parsing/strategies/ruleBasedExtraction.strategy.ts`, regex/heuristik tanpa API eksternal — `ANTHROPIC_API_KEY` tidak lagi wajib); `ClaudeExtractionStrategy.extract()` (`src/modules/parsing/strategies/claudeExtraction.strategy.ts`) tetap ada sebagai opsi, dipakai otomatis oleh `container.ts` hanya jika `ANTHROPIC_API_KEY` diisi. Keduanya dipilih per sender lewat `ExtractionStrategyResolver` (Strategy pattern; semua provider saat ini memakai strategi default yang sama). Detail strategi Claude:
  - Prompt terstruktur, output JSON `{merchant, amount, type, date, confidence}` ✓
  - Model: `claude-haiku-4-5-20251001` (kecil/cepat) ✓
  - Validasi output lewat `validateExtraction()` — JSON shape, amount non-negatif, type enum, date valid, confidence 0..1 — 7 unit test lolos (`src/modules/parsing/strategies/extraction.strategy.test.ts`)
- [x] Simpan sebagai `Transaction` dengan status `pending_review`/`confirmed` berdasar threshold (default `0.85`, di-inject ke `EmailParsingService` lewat `confidenceThreshold`, gampang di-tuning nanti)
- [x] Auto-suggest kategori berdasar keyword merchant (`src/modules/parsing/categorySuggestion.ts`, 6 unit test lolos) — kategori di-upsert atomik per user lewat `PrismaCategoryRepository.findOrCreateByName` (`src/modules/parsing/category.repository.ts`) untuk hindari race condition duplikat kategori saat banyak job parsing jalan bersamaan (mis. backfill 50+ email)
- [x] Dedupe check by `gmail_message_id` sebelum insert — dicek eksplisit di awal job parsing, plus `@unique` constraint di DB + catch `P2002` sebagai pengaman race antar job

**Definition of Done:** Setelah connect Gmail, dalam beberapa menit transaksi mulai muncul di database dengan data yang terisi (merchant, amount, type, date, category suggestion).

**Status:** Kode lengkap, lolos verifikasi statis (typecheck + lint + `pnpm --filter backend test`, total 28/28 unit test termasuk 13 test baru untuk validasi ekstraksi, keyword kategori, dan matching sender allowlist). **Verifikasi end-to-end live belum bisa dilakukan** — tiga prasyarat masih pending di luar kendali agent:
1. Redis belum jalan (Docker belum terpasang, sama seperti Fase 0/1) — BullMQ queue/worker belum pernah dites memproses job sungguhan. Saat `pnpm dev`/test jalan tanpa Redis, akan muncul log `[redis] connection error: ...` di stderr — ini normal/terduga, sudah sengaja dijadikan pesan singkat (bukan stack trace mentah) lewat error handler di `src/shared/redis.ts`.
2. Gmail OAuth belum live (prasyarat dari Fase 0/1) — `listAllowlistedMessageIds`/`fetchEmail` belum pernah dites melawan Gmail API sungguhan.
3. ~~`ANTHROPIC_API_KEY` belum diisi~~ — **tidak lagi memblokir (Juli 2026):** ekstraksi default sekarang rule-based tanpa API eksternal. `ANTHROPIC_API_KEY` hanya perlu diisi kalau mau memakai `ClaudeExtractionStrategy`.

Setelah Docker + Redis jalan dan Gmail OAuth live: jalankan `pnpm --filter @budgetmail/backend exec prisma migrate dev --name add_transaction_pipeline`, start API (`pnpm --filter backend dev`) dan worker (`pnpm --filter backend worker:dev`) di dua terminal terpisah, lalu connect Gmail dari akun asli dan pantau tabel `sync_jobs`/`transactions` untuk verifikasi end-to-end. **Sebelum production**, validasi ulang `senderAllowlist.ts` terhadap sampel inbox asli tiap provider (lihat catatan confidence di checklist atas).

**Catatan review keamanan:** subagent kustom `gmail-security-reviewer` masih belum ter-load di sesi ini (lihat catatan Fase 1). Review manual difokuskan ke bagian yang menyentuh Gmail/token: `fetchEmail` sengaja pakai `format: "metadata"` (bukan `"full"`) supaya raw snippet minimal; semua pemanggilan Gmail API tetap read-only (list/get saja, sesuai scope `gmail.readonly`, tidak ada modify/delete); error dari Google API di `syncService.ts` disimpan sebagai `err.message` saja ke kolom `SyncJob.errorMessage` (bukan objek error mentah), konsisten dengan pola sanitasi log dari Fase 1. **Jalankan ulang `gmail-security-reviewer` di sesi baru** begitu subagent-nya ter-load untuk verifikasi independen.

---

## Fase 3 — Transaction Management (API + Mobile)

### Backend
- [x] Endpoint `GET /transactions?month=&category=&status=&type=&cursor=&limit=` — list dengan filter & pagination keyset (cursor = id transaksi terakhir); default menyembunyikan `ignored`. Plus `GET /transactions/:id` (detail, termasuk `rawSnippet` untuk ditinjau)
- [x] Endpoint `PATCH /transactions/:id` — update field (amount, category, date, merchant, type, status); kategori divalidasi (milik user/default + tipe cocok), ganti tipe tanpa memilih kategori baru → kategori di-null-kan
- [x] Endpoint `DELETE /transactions/:id` — transaksi manual dihapus permanen; transaksi Gmail jadi `ignored` (tombstone dedupe, tidak diimpor ulang saat backfill berikutnya)
- [x] Endpoint `POST /transactions` — input manual (langsung `confirmed`)
- [x] Endpoint `GET /categories` — list kategori default + custom milik user (default global di-seed di migration `transactions_budgets`; parsing sekarang memakai kategori default yang sama, bukan membuat salinan per user)
- [x] Endpoint `POST /categories` — tambah kategori custom (cek duplikat case-insensitive → 409)
- Modul baru: `categories/`, `transactions/` (service + routes), validasi JSON schema Fastify, error handler global `{ error }`. Lihat `apps/backend/ARCHITECTURE.md`.

### Mobile
- [x] Layar daftar transaksi (tab Transaksi): dikelompokkan per hari dengan total harian, filter chip (Semua / Perlu ditinjau / Pengeluaran / Pemasukan), month selector, infinite scroll, badge pill "Perlu ditinjau"
- [x] Layar detail/edit transaksi (`transaction/[id]`, modal): form merchant/amount/kategori/tanggal/tipe, cuplikan email + confidence untuk entri Gmail, "Konfirmasi transaksi", tombol hapus/abaikan dengan konfirmasi
- [x] Form tambah transaksi manual (`transaction/new`)
- [x] Picker kategori (bottom sheet) dengan opsi tambah kategori baru + pilihan ikon
- [x] Pull-to-refresh yang trigger `POST /gmail/sync` (dashboard & daftar transaksi), dengan indikator "pulse" gradient (Design.md §6)

**Definition of Done:** User bisa melihat, mengedit, menghapus, dan menambah transaksi manual dari mobile app, semua tersinkron dengan backend.

**Status (Okt 2026):** Kode lengkap. Backend: 96/96 unit test lolos (termasuk test route HTTP dengan repository in-memory: 401 sebelum validasi, 400, 404 antar-user, 409), typecheck + lint bersih, dan smoke test live ke Postgres sungguhan (create/list/patch/delete transaksi, kategori, budget, dashboard) lolos. Mobile: typecheck + lint bersih, bundle Android (`expo export`) sukses, dan semua layar dirender & diperiksa visual lewat Expo web (headless browser) dengan data demo. **Belum diverifikasi di device/emulator sungguhan**, dan alur login Google + connect Gmail end-to-end masih menunggu langkah manual Fase 0.

---

## Fase 4 — Dashboard & Budget

### Backend
- [x] Endpoint `GET /dashboard/summary?month=` — total income, total expense, balance, breakdown pengeluaran per kategori (dengan share), jumlah `pending_review`, dan progres budget. **Hanya transaksi `confirmed` yang dihitung**; yang `pending_review` muncul sebagai ajakan "N transaksi perlu ditinjau"
- [x] Model Prisma: `Budget` (unik per user + kategori + bulan)
- [x] Endpoint `GET /budgets?month=` — sekaligus mengembalikan progres (spent, remaining, ratio, state ok / warning ≥80% / over >100%)
- [x] Endpoint `POST /budgets` — set/update (upsert) budget per kategori pengeluaran per bulan; plus `DELETE /budgets/:id` dan `POST /budgets/copy` (pakai budget bulan lalu)
- [x] Logic hitung progres budget — `computeBudgetProgress` (pure, dipakai di `/budgets` dan summary; endpoint `/budgets/progress` terpisah tidak diperlukan)
- Batas bulan dihitung dalam WIB (UTC+7) supaya transaksi dini hari tanggal 1 tidak masuk ke bulan sebelumnya (`src/shared/month.ts`)

### Mobile
- [x] Layar dashboard (tab Beranda): hero card saldo bersih + pemasukan/pengeluaran dengan ambient glow, notice transaksi perlu ditinjau, breakdown kategori, 3 budget teratas
- [x] Chart breakdown pengeluaran per kategori — **deviasi disengaja:** dibuat sendiri (stacked bar tersegmen + legend berlabel) dengan palet kategori yang divalidasi CVD/kontras terhadap `bg.surface`, bukan `victory-native`/`gifted-charts`. Lebih ringan, tanpa dependency Skia, dan warnanya pasti mengikuti token (Design.md §7 mengizinkan "donut/bar sederhana")
- [x] Layar budget: total terpakai, list kategori dengan progress bar yang warnanya bertransisi teal → warning → danger, status ikon + teks ("Sisa"/"Lewat"), form set budget (`budget/edit`), empty state + "Pakai budget bulan lalu"
- [x] Month selector (navigasi antar bulan; budget boleh 1 bulan ke depan)

**Status (Okt 2026):** Kode lengkap dan terverifikasi sejauh yang sama dengan Fase 3 (unit test + smoke test live + render visual web). Belum dicoba di device fisik.

**Definition of Done:** Dashboard menampilkan data real dari transaksi yang sudah masuk, dan user bisa set + memantau budget per kategori.

---

## Fase 5 — Polish, Error Handling & Testing Internal

- [x] Empty states: belum connect Gmail (banner; onboarding bisa dilewati untuk mencatat manual), belum ada transaksi, budget belum diset, semua sudah ditinjau — microcopy dari Design.md §7
- [x] Loading states untuk semua fetch (skeleton shimmer, menghormati reduced-motion)
- [x] Error states: sync gagal/token expired (banner + tombol "Hubungkan ulang Gmail" di dashboard, transaksi, dan Akun), API error umum ("Coba lagi"), sesi kedaluwarsa (401 → otomatis logout)
- [x] Notifikasi in-app sederhana saat sync selesai dengan transaksi baru — toast "N transaksi baru masuk dari Gmail" dengan jejak gradient "Inflow" (Design.md §4); baris transaksi baru masuk dengan animasi yang sama. `GET /gmail/status` sekarang menyertakan `lastSync` (id, status, waktu, transactionsCreated) untuk keperluan ini
- [ ] Tambahkan diri sendiri (dan beta tester lain, maks 100 total) sebagai **test user** di Google Cloud Console OAuth consent screen
- [ ] Uji end-to-end dengan akun Gmail asli selama minimal 1–2 minggu, catat akurasi parsing aktual untuk tuning threshold confidence & prompt ekstraksi

**Definition of Done:** App stabil dipakai sehari-hari oleh diri sendiri sebagai test user, tanpa crash, dengan akurasi parsing yang sudah diverifikasi manual.

**Status (Okt 2026):** 4 item kode di atas selesai. Dua item sisanya **manual dan belum bisa dikerjakan agent**: daftarkan test user di Google Cloud Console, lalu uji end-to-end dengan Gmail asli selama 1–2 minggu (jalankan `parsing-accuracy-auditor` dengan sampel email nyata untuk tuning threshold). Review subagent: `gmail-security-reviewer` tidak menemukan masalah Critical maupun IDOR; temuan Warning sudah diperbaiki (`raw_snippet` kini hanya disimpan selama `pending_review`, log error Prisma tanpa argumen query, P2002 kategori → 409, token web tidak dipersist di build produksi). `design-consistency-checker` menemukan 3 pelanggaran (touch target chip/segmented < 44pt dan animasi Inflow tanpa fallback reduced-motion), semuanya sudah diperbaiki.

---

## Fase 6 — Sebelum Public Launch (di luar scope coding murni)

- [ ] Tulis Privacy Policy yang menyebutkan eksplisit: akses Gmail readonly, pengiriman isi email ke LLM pihak ketiga untuk parsing, retensi data
- [ ] Putuskan open question: self-CASA assessment vs managed OAuth provider (lihat PRD §12)
- [ ] Jika self-assessment: submit Google OAuth verification, siapkan dokumentasi keamanan untuk CASA Tier assessment
- [ ] Review scope data yang disimpan — pastikan raw email body tidak disimpan lebih dari yang perlu (memperkecil scope assessment)

---

## P1 Backlog (setelah MVP tervalidasi — lihat PRD §9)

- [ ] Migrasi sync dari polling ke Gmail push notification (Cloud Pub/Sub + `users.watch`)
- [ ] Notifikasi budget hampir/terlampaui limit
- [ ] Deteksi transaksi berulang/subscription
- [ ] Export CSV
- [ ] Search & filter transaksi lanjutan
- [ ] User bisa tambah sender allowlist custom sendiri
