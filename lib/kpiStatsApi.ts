export type MetricSnapshotPoint = {
  value: number;
  recordedAt: string;
};

/** Build 2–N points for a KPI mini sparkline (newest snapshots last). */
export function sparklineSeriesFromSnapshots(
  snapshots: MetricSnapshotPoint[] | undefined,
  current: number,
  maxPoints = 16
): number[] {
  const sorted = [...(snapshots ?? [])].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const vals = sorted.map((s) => {
    const n = Number(s.value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  const clipped = vals.length > maxPoints ? vals.slice(-maxPoints) : vals;
  if (clipped.length >= 2) return clipped;
  const cur = Math.max(0, Number(current));
  if (clipped.length === 1) {
    const v = clipped[0]!;
    const prev = Math.max(0, Math.round(v * 0.88));
    return prev === v ? [Math.max(0, v - 1), v] : [prev, v];
  }
  if (cur === 0) return [0, 0];
  return [Math.round(cur * 0.72), cur];
}

export type MetricSeriesPayload = {
  current: number;
  snapshots: MetricSnapshotPoint[];
  /** Last N days (oldest → newest), **per-day** activity from the server (not cumulative totals). */
  chartSeries?: number[];
};

/** Prefer live `chartSeries` from the API; otherwise derive a short series from snapshots + current. */
export function resolveKpiChartValues(
  chartSeries: number[] | undefined,
  snapshots: MetricSnapshotPoint[] | undefined,
  current: number
): number[] {
  if (Array.isArray(chartSeries) && chartSeries.length >= 2) {
    return chartSeries.map((n) => (Number.isFinite(n) && n >= 0 ? n : 0));
  }
  return sparklineSeriesFromSnapshots(snapshots, current);
}

/** % change from first → last point in the KPI series (for dashboard trend line). */
export function computeSparklineTrendPct(values: number[] | undefined): {
  label: string;
  tone: "up" | "down" | "flat";
} {
  const v = (values ?? []).map((n) => (Number.isFinite(n) ? Number(n) : 0));
  if (v.length < 2) {
    return { label: "+0.0%", tone: "flat" };
  }
  const first = v[0]!;
  const last = v[v.length - 1]!;
  if (first === 0 && last === 0) {
    return { label: "+0.0%", tone: "flat" };
  }
  let pct: number;
  if (first === 0) {
    pct = last > 0 ? 100 : 0;
  } else {
    pct = ((last - first) / Math.abs(first)) * 100;
  }
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return { label: "+0.0%", tone: "flat" };
  }
  const tone: "up" | "down" | "flat" = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const sign = rounded > 0 ? "+" : "";
  return { label: `${sign}${rounded.toFixed(1)}%`, tone };
}

export type DashboardStatsResponse = {
  activeWorkspace: {
    name: string;
    totalWorkspaces: number;
    /** User-level workspace count history for the first KPI sparkline. */
    countSnapshots?: MetricSnapshotPoint[];
  };
  totalLeads: MetricSeriesPayload;
  contactedLeads: MetricSeriesPayload;
  /** Still returned for cache reconciliation / other callers; fourth dashboard card uses `avgOpenRate`. */
  totalCampaigns: MetricSeriesPayload;
  /** Workspace-wide opens ÷ sends (email channel events), %. */
  avgOpenRate: MetricSeriesPayload;
};

export type WorkspacesStatsResponse = {
  totalWorkspaces: MetricSeriesPayload;
  workspaceLeads: MetricSeriesPayload;
  activeCampaigns: MetricSeriesPayload;
  enrichedLeads: MetricSeriesPayload;
};

export type LeadsStatsResponse = {
  totalLeads: MetricSeriesPayload;
  contactedLeads: MetricSeriesPayload;
  enrichedLeads: MetricSeriesPayload;
  conversionRate: MetricSeriesPayload;
};

export type CampaignsStatsResponse = {
  totalCampaigns: MetricSeriesPayload;
  avgOpenRate: MetricSeriesPayload;
  workspaceLeads: MetricSeriesPayload;
  totalSent: MetricSeriesPayload;
};
