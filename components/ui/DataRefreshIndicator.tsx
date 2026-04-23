"use client";

import { Icons } from "@/components/ui/Icons";

/** Shown when cached data is on screen and a background refetch is in flight. */
export function DataRefreshIndicator({
  show,
  label = "Syncing",
}: {
  show: boolean;
  /** Short label next to the spinner (keep ≤ ~12 chars for toolbar layouts). */
  label?: string;
}) {
  if (!show) return null;
  return (
    <span
      className="data-refresh-indicator"
      role="status"
      aria-live="polite"
      aria-label={label ? `${label} data` : "Refreshing data"}
    >
      <Icons.Loader size={13} strokeWidth={2.25} className="data-refresh-indicator__spin" aria-hidden />
      {label ? <span className="data-refresh-indicator__text">{label}</span> : null}
    </span>
  );
}
