// Months are "YYYY-MM" with boundaries in WIB (UTC+7). In UTC, a transaction at
// 01:00 WIB on the 1st would land in the previous month.
const APP_UTC_OFFSET_MINUTES = 7 * 60;

export const MONTH_PATTERN = "^[0-9]{4}-(0[1-9]|1[0-2])$";
const monthRegex = new RegExp(MONTH_PATTERN);

export function isValidMonth(month: string): boolean {
  return monthRegex.test(month);
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  if (!isValidMonth(month)) {
    throw new Error(`Invalid month: ${month}`);
  }
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return { year, monthIndex: monthNumber - 1 };
}

// [from, to) as UTC instants.
export function monthRange(month: string): { from: Date; to: Date } {
  const { year, monthIndex } = parseMonth(month);
  const offsetMs = APP_UTC_OFFSET_MINUTES * 60_000;
  return {
    from: new Date(Date.UTC(year, monthIndex, 1) - offsetMs),
    to: new Date(Date.UTC(year, monthIndex + 1, 1) - offsetMs),
  };
}

export function monthOf(date: Date): string {
  const local = new Date(date.getTime() + APP_UTC_OFFSET_MINUTES * 60_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth(now: Date = new Date()): string {
  return monthOf(now);
}
