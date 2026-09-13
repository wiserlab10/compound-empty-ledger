const KST = "Asia/Seoul";

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function toISODate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatKoreanDate(iso: string): string {
  const d = parseISODate(iso);
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${week}`;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function nowMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function formatClock(now = new Date()): string {
  return formatTime(nowMinutes(now));
}

/** JS getDay() Sunday=0 → Monday=0 … Sunday=6 */
export function mondayIndex(iso: string): number {
  const js = parseISODate(iso).getDay();
  return (js + 6) % 7;
}

export function jsWeekday(iso: string): number {
  return parseISODate(iso).getDay();
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function daysInMonth(iso: string): number {
  const d = parseISODate(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function monthLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(Math.min(d.getDate(), new Date(y, d.getMonth() + 1, 0).getDate())).padStart(
    2,
    "0",
  );
  return `${y}-${m}-${day}`;
}

export function startOfWeekMonday(iso: string): string {
  const dow = mondayIndex(iso);
  return addDays(iso, -dow);
}

export const WEEKDAYS_KR = ["월", "화", "수", "목", "금", "토", "일"];
export const WEEKDAYS_JS = ["일", "월", "화", "수", "목", "금", "토"];

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
