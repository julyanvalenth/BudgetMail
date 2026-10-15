# Design.md — Design Direction & Visual System
**App:** BudgetMail (working title)
**Platform:** React Native (Expo)
**Tanggal:** 2 Juli 2026

> Dokumen ini melengkapi `PRD.md` dan `TASKS.md`. Isinya arah visual, bukan requirement fungsional — dipakai Claude Code sebagai acuan saat membangun komponen UI di Fase 3–4 (Transaction Management, Dashboard & Budget).

---

## 1. Thesis Arah Desain

**"Vault yang hidup"** — dashboard finansial gelap dan tenang seperti brankas, tapi bukan brankas mati: ada aliran cahaya lembut (gradient teal→violet) yang menandakan uang terus "mengalir masuk" dari Gmail tanpa kamu sentuh. Struktur rapi ala tooling teknis (grid, garis tipis, angka presisi) supaya user merasa **in control**, dilapisi kehangatan pada micro-copy dan bentuk rounded supaya urusan uang tidak terasa mengintimidasi.

Dark-mode adalah default (bukan sekadar tema alternatif) — cocok untuk app yang dibuka tiap hari, dan sejalan dengan seluruh mood reference yang diberikan.

---

## 2. Breakdown Mood Board (referensi → yang diambil, bukan ditiru)

Lima gambar yang diberikan **tidak ada satupun yang ditiru langsung** — yang diambil adalah "rasa"-nya, lalu digabung jadi identitas baru:

| Referensi | Yang diambil (vibe) | Yang **tidak** dipakai |
|---|---|---|
| **"Beyond"** (fintech card app, ribbon holografik ungu) | Kepercayaan diri palet gelap + kartu glossy, stepper transaksi berbentuk lingkaran bertahap | Ribbon iridescent penuh warna — terlalu ramai untuk app yang dibuka tiap hari |
| **"Zentra"** (finance app, glow biru) | Radial glow lembut di belakang elemen hero, tombol pill, segmented toggle di paywall | Warna biru dominan tunggal — kita perlu warna semantik income/expense yang jelas |
| **"PS11"** (task app, grid geometris navy) | Garis grid tipis & bentuk geometris outline sebagai motif struktur/"keteraturan", progress bar di dalam card | Palet biru-terang task-app generik |
| **"WealthWave"** (dashboard investasi) | Orb cahaya blur di balik konten (ambient light), chart multi-warna untuk breakdown kategori, ikon aksi bulat berwarna | Kompleksitas dashboard trading (terlalu banyak angka sekaligus) |
| **Journal app** (teal-hitam, kartu bulat, mood tag) | Kehangatan: rounded card besar, pill tag, nada suportif pada microcopy & empty state | Ilustrasi karakter kartun — tidak cocok untuk konteks finansial serius |

---

## 3. Design Tokens

### 3.1 Warna — Core Palette

| Token | Hex | Peran |
|---|---|---|
| `bg.base` | `#0B0F17` | Void Navy — background utama, hampir hitam tapi bukan pure black |
| `bg.surface` | `#141B26` | Card Navy — permukaan card/elevated surface |
| `brand.teal` | `#22D3AE` | Ledger Teal — warna utama brand, primary CTA, indikator "sehat/positif" |
| `brand.violet` | `#8B7CF6` | Drift Violet — pasangan gradient dari teal, dipakai di aksen sekunder & signature motion |
| `border.hairline` | `rgba(255,255,255,0.08)` | Pemisah antar card di atas dark background (bukan shadow berat) |
| `text.primary` | `#F4F6FA` | Teks utama |
| `text.muted` | `#8993A8` | Teks sekunder/caption |

Gradient signature (dipakai terbatas — lihat §4): `linear-gradient(135deg, #22D3AE 0%, #8B7CF6 100%)`

### 3.2 Warna — Semantic (transaksi & budget)

| Token | Hex | Peran |
|---|---|---|
| `signal.income` | `#22D3AE` (sama dengan Ledger Teal) | Nominal pemasukan, transaksi masuk |
| `signal.expense` | `#FF7A66` | Ember Coral — nominal pengeluaran (coral hangat, bukan merah alarm) |
| `signal.warning` | `#F5B84C` | Budget mendekati limit (≥80%) |
| `signal.danger` | `#FF4D4D` | Budget terlampaui, sync error |

> Prinsip: income & sync sukses selalu di jalur teal/violet (positif, tenang). Expense pakai coral hangat — bukan merah menyala — supaya melihat pengeluaran harian tidak terasa seperti diomeli. Merah murni (`danger`) disimpan khusus untuk kondisi yang benar-benar butuh perhatian: over-budget & error.

### 3.3 Tipografi

| Role | Font | Catatan |
|---|---|---|
| Display/Headline | **Space Grotesk** (600/700) | Karakter geometris-teknis, dipakai di judul screen & angka besar non-nominal |
| Body/UI | **Manrope** (400/500/600) | Humanist, ramah, sangat terbaca di ukuran kecil (list, label) |
| Angka nominal | **Space Grotesk** dengan `font-variant-numeric: tabular-nums`, atau IBM Plex Mono untuk angka besar di dashboard | Supaya digit sejajar rapi di list transaksi — penting untuk app finansial |

Semua font tersedia via `@expo-google-fonts/space-grotesk` dan `@expo-google-fonts/manrope`.

**Type scale (mobile):**

| Style | Size / Line-height | Weight | Font |
|---|---|---|---|
| Display | 32 / 38 | 700 | Space Grotesk |
| H1 (judul screen) | 24 / 30 | 600 | Space Grotesk |
| H2 (section header) | 18 / 24 | 600 | Space Grotesk |
| Body | 16 / 22 | 400–500 | Manrope |
| Body Small | 14 / 20 | 400 | Manrope |
| Caption | 12 / 16 | 500 | Manrope |
| Amount — Hero (dashboard total) | 36 / 40 | 700 | Space Grotesk, tabular |
| Amount — List item | 16 / 22 | 600 | Space Grotesk, tabular |

### 3.4 Spacing & Radius

- Grid dasar: kelipatan **4pt** (4 / 8 / 12 / 16 / 24 / 32 / 48)
- Radius card: **20px**
- Radius button: **14px** (bukan pill, kecuali untuk segmented toggle/filter chip → pill penuh `999px`, diambil dari referensi Zentra)
- Border card: 1px `border.hairline` — dark UI lebih baik pakai hairline border daripada drop-shadow berat (shadow gelap-di-atas-gelap cenderung terlihat kotor)

### 3.5 Elevasi di Dark UI

Hindari `box-shadow` hitam pekat (tidak terlihat di background gelap). Gunakan kombinasi:
1. `bg.surface` sedikit lebih terang dari `bg.base` untuk membedakan layer
2. Hairline border 1px
3. (Opsional, untuk card penting seperti ringkasan dashboard) glow tipis dari `brand.teal`/`brand.violet` dengan opacity rendah (8–12%) di belakang card — echo dari ambient orb di referensi WealthWave/Zentra, dipakai sangat terbatas

---

## 4. Signature Element — "The Inflow"

Satu elemen yang bikin app ini dikenali: **garis gradient tipis (teal→violet) yang "mengalir" dari ikon Gmail ke daftar transaksi setiap kali sync berhasil menemukan transaksi baru.**

- Saat sync selesai dan ada transaksi baru: card transaksi baru masuk ke list dengan animasi slide-in singkat, disertai jejak gradient tipis yang cepat memudar (durasi ±400ms, hormati reduced-motion — jika reduced-motion aktif, ganti dengan fade sederhana tanpa jejak garis)
- Elemen yang sama dipakai lebih besar & tenang di layar onboarding "Hubungkan Gmail" — garis mengalir dari logo Gmail ke logo app, memvisualisasikan mekanisme inti produk (transaksi masuk otomatis) tanpa perlu ilustrasi rumit

Ini disengaja terikat ke **mekanisme produk** (auto-capture dari email), bukan dekorasi lepas — sesuai prinsip "signature element yang menjelaskan brief".

---

## 5. Ikonografi & Imagery

- Satu icon family konsisten: **Lucide** (`lucide-react-native`) — line icon, stroke 1.5–2px, cocok dengan mood teknis/rapi dari referensi PS11
- Ikon kategori transaksi (makanan, transport, dll.) pakai warna latar bulat lembut (`bg.surface` + tint warna kategori 15% opacity), bukan warna solid penuh — biar tidak bersaing dengan warna semantik income/expense
- Tidak pakai emoji sebagai ikon fungsional
- Tidak pakai ilustrasi karakter kartun (beda dari referensi journal app) — konteks finansial butuh terasa lebih tepercaya/serius, kehangatan cukup disalurkan lewat microcopy & warna, bukan karakter

---

## 6. Motion & Micro-interaction

| Momen | Treatment |
|---|---|
| Sync berhasil menemukan transaksi baru | Signature "Inflow" (lihat §4) |
| Tap kartu transaksi → detail | Shared-element transition sederhana (card membesar jadi sheet), 200–250ms |
| Progress bar budget mendekati limit | Warna bertransisi halus teal → warning → danger seiring persentase naik, bukan lompatan warna tiba-tiba |
| Pull-to-refresh | Indikator custom bertema "denyut" gradient tipis, bukan spinner default OS |
| Loading list transaksi | Skeleton shimmer dengan warna `bg.surface`, bukan spinner tunggal di tengah layar |

Semua motion **wajib menghormati `prefers-reduced-motion`** (di Expo: cek `AccessibilityInfo.isReduceMotionEnabled()`) — ganti dengan fade instan.

---

## 7. Arahan Visual per Screen

**Onboarding & Connect Gmail**
Background `bg.base` dengan ambient glow teal-violet blur besar & samar di belakang ilustrasi (echo Zentra/WealthWave). Grid garis tipis opsional di layer paling belakang (echo PS11) untuk kesan "terstruktur". Headline besar Space Grotesk. Penjelasan izin Gmail ditulis jujur & spesifik (bukan legal-jargon) — sesuai prinsip menulis untuk kepercayaan.

**Daftar Transaksi**
List berbasis card tipis dengan hairline border, dikelompokkan per tanggal. Nominal pakai warna semantik (teal untuk masuk, coral untuk keluar) dengan tabular numerals rapi kanan-rata. Badge kecil pill untuk status `pending_review`.

**Detail/Edit Transaksi**
Sheet modal dari bawah, radius besar (20px) di top corners. Field form dengan label mengambang (floating label) gaya Manrope, bukan placeholder-only.

**Dashboard**
Hero card besar di atas: total saldo bulan ini, angka Display/Amount-Hero, sedikit ambient glow di belakang card ini saja (bukan di semua card — restraint). Chart breakdown kategori pakai palet warna kategori yang berbeda-beda tapi tetap harmonis dengan base gelap (echo WealthWave), bentuk donut/bar sederhana — hindari pie chart ramai.

**Budget**
List kategori dengan progress bar horizontal, warna berubah sesuai §6. Tombol "+ Set Budget" pakai style pill (echo Zentra).

**Empty & Error States**
Nada suportif, bukan generik. Contoh microcopy:
- Belum connect Gmail: "Transaksimu belum tersinkron. Hubungkan Gmail dan biarkan sisanya berjalan otomatis."
- Sync gagal (token expired): "Koneksi Gmail terputus. Sambungkan ulang untuk lanjut menangkap transaksimu."
- Belum ada budget: "Belum ada batas yang diset. Mulai dari satu kategori yang paling sering bikin boncos."

---

## 8. Aksesibilitas & Implementasi Dark Mode

- Kontras teks utama terhadap `bg.base`/`bg.surface` minimal **4.5:1**, teks sekunder minimal **3:1** — cek `text.muted` (`#8993A8`) terhadap kedua background, sudah lolos di kedua kasus
- Warna tidak jadi satu-satunya indikator status (income/expense/warning juga dibedakan lewat ikon panah arah `+`/`-` dan posisi, bukan warna semata) — penting untuk user dengan color vision deficiency
- Touch target minimal 44×44pt
- Semua ikon fungsional (bukan dekoratif) punya accessibility label
- **Scope MVP: dark mode only.** Light mode tidak masuk P0 (selaras dengan prinsip "ketat scope" di PRD) — token warna di §3 ditulis dalam format tema (`bg.base`, `text.primary`, dst.) supaya mudah ditambah varian light theme di P1 tanpa refactor besar.

---

## 9. Implementasi di React Native

- Simpan semua token di satu file tema (`src/theme/tokens.ts`), **jangan hardcode hex** di komponen — sejalan dengan prinsip "token tema konsisten, bukan hex per-screen"
- `expo-linear-gradient` untuk gradient signature (§4) dan ambient glow (§3.5)
- `react-native-svg` untuk garis grid tipis di background onboarding & custom line-icon jika Lucide belum cover suatu ikon
- Chart dashboard: `victory-native` atau `react-native-gifted-charts` (sudah direkomendasikan di `TASKS.md` Fase 4) — styling warna kategori mengikuti token di §3.2, bukan warna default library
- Gunakan `SafeAreaView`/`useSafeAreaInsets` konsisten agar konten tidak tertutup notch/home indicator (relevan karena hero card dashboard menempel di atas)
