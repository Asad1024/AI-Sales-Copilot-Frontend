/**
 * `datetime-local` yields strings like `2026-04-25T14:30` with no timezone.
 * Per the JS spec, `new Date(thatString)` is interpreted in the user's local timezone.
 *
 * The API previously treated offset-less strings as GCC (UTC+4), which is wrong for
 * most regions (e.g. Asia/Karachi, US, EU). Sending UTC ISO with `Z` fixes BullMQ delay
 * and worker checks to match the user's chosen wall time.
 */
export function campaignScheduleFieldToUtcIso(value: string | null | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) return s;
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  return new Date(t).toISOString();
}

/** Readable span between two instants (ms since epoch). */
export function formatScheduleWindowMs(startMs: number, endMs: number): string {
  const ms = endMs - startMs;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "< 1 minute";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / 3600000);
  const remMins = Math.round((ms % 3600000) / 60000);
  if (ms < 48 * 3600000) {
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.ceil(ms / 86400000);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Readable span for UI (naive strings use the browser's local timezone). */
export function formatScheduleWindowLabel(start: string, end: string): string {
  return formatScheduleWindowMs(new Date(start).getTime(), new Date(end).getTime());
}
