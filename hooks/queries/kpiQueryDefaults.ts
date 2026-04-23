/** Shared stale window for KPI / dashboard-style GETs (matches prior ~2m UX). */
export const KPI_QUERY_STALE_MS = 2 * 60 * 1000;

export const KPI_REFETCH_INTERVAL_MS = 25_000;

/** Pause background refetch when tab is hidden (battery + noise). */
export function refetchIntervalWhenVisible(intervalMs: number) {
  return () => {
    if (typeof document === "undefined") return false;
    return document.visibilityState === "visible" ? intervalMs : false;
  };
}
