// Formatted by hand instead of with Intl, because Hermes' Intl support differs
// between platforms and builds.

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function groupThousands(value: number): string {
  return Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Negative values use a real minus sign (U+2212), like the amounts in lists
export function formatRupiah(value: number): string {
  return `${value < 0 ? "−" : ""}Rp${groupThousands(value)}`;
}

// Short form for tight spots (chart legends): Rp1,2jt / Rp850rb
export function formatRupiahCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000)}jt`;
  if (abs >= 1_000) return `${sign}Rp${trimDecimal(abs / 1_000)}rb`;
  return formatRupiah(value);
}

function trimDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace(".", ",");
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// "YYYY-MM" for a local date
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return toMonthKey(new Date(year, monthNumber - 1 + delta, 1));
}

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return `${MONTHS[monthNumber - 1]} ${year}`;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex] ?? "";
}

export function toDayKey(date: Date): string {
  return `${toMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDayKey(a) === toDayKey(b);
}

// Section header in the transaction list: "Hari ini", "Kemarin", "Senin, 12 Okt"
export function formatDayHeading(date: Date, now: Date = new Date()): string {
  if (isSameDay(date, now)) return "Hari ini";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Kemarin";
  const base = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

// Form field value: "Selasa, 14 Oktober 2026"
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMinutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return "baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${formatTime(date)}`;
}

// Digits-only parse for the amount inputs ("25.000" -> 25000)
export function parseAmountInput(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
