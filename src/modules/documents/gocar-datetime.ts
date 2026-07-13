/**
 * GoCar receipt stores display strings (not ISO).
 * These helpers format native date/time picker values into the exact copy
 * the PDF/template already expect.
 */

const DAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const MONTHS_ID = [
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
] as const;

const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  MONTHS_ID.map((m, i) => [m.toLowerCase(), i])
);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date → yyyy-mm-dd (no UTC shift). */
export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local time → HH:mm */
export function toTimeInputValue(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parse yyyy-mm-dd as local Date at 00:00. */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Parse HH:mm (24h). */
export function parseTimeInput(value: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** "Kamis, 11 Juni 2026" */
export function formatOrderDate(dateInput: string): string | null {
  const d = parseDateInput(dateInput);
  if (!d) return null;
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** "11 Juni 2026 jam 15:25" */
export function formatTripDateTime(
  dateInput: string,
  timeInput: string
): string | null {
  const d = parseDateInput(dateInput);
  const t = parseTimeInput(timeInput);
  if (!d || !t) return null;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()} jam ${pad2(t.h)}:${pad2(t.m)}`;
}

/** Reverse: "Kamis, 11 Juni 2026" → yyyy-mm-dd */
export function parseOrderDateDisplay(value: string): string | null {
  const m =
    /^(?:Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu),\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i.exec(
      value.trim()
    );
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_INDEX[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (month === undefined) return null;
  const d = new Date(year, month, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return toDateInputValue(d);
}

/** Reverse: "11 Juni 2026 jam 15:25" → { date, time } */
export function parseTripDateTimeDisplay(
  value: string
): { date: string; time: string } | null {
  const m =
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+jam\s+(\d{1,2}):(\d{2})$/i.exec(
      value.trim()
    );
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_INDEX[m[2].toLowerCase()];
  const year = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  if (month === undefined || h > 23 || min > 59) return null;
  const d = new Date(year, month, day, h, min);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return { date: toDateInputValue(d), time: `${pad2(h)}:${pad2(min)}` };
}

/** Whole minutes between two trip display strings; null if unparseable/negative. */
export function durationMinutesBetween(
  pickupDisplay: string | undefined,
  dropoffDisplay: string | undefined
): number | null {
  if (!pickupDisplay || !dropoffDisplay) return null;
  const a = parseTripDateTimeDisplay(pickupDisplay);
  const b = parseTripDateTimeDisplay(dropoffDisplay);
  if (!a || !b) return null;
  const da = parseDateInput(a.date);
  const db = parseDateInput(b.date);
  const ta = parseTimeInput(a.time);
  const tb = parseTimeInput(b.time);
  if (!da || !db || !ta || !tb) return null;
  const start = new Date(
    da.getFullYear(),
    da.getMonth(),
    da.getDate(),
    ta.h,
    ta.m
  );
  const end = new Date(
    db.getFullYear(),
    db.getMonth(),
    db.getDate(),
    tb.h,
    tb.m
  );
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  return mins >= 0 ? mins : null;
}

export function formatDurationMinutes(mins: number): string {
  return `${mins} menit`;
}
