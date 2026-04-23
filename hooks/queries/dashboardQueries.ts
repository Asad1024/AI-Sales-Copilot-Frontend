import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import type { DashboardStatsResponse } from "@/lib/kpiStatsApi";
import { KPI_QUERY_STALE_MS, refetchIntervalWhenVisible } from "./kpiQueryDefaults";

const ANALYTICS_TTL_MS = KPI_QUERY_STALE_MS;
const STATS_SESSION_PREFIX = "sparkai:dashboard:stats:";

function readSessionJson<T>(key: string): { data: T; updatedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: T; timestamp?: number };
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > ANALYTICS_TTL_MS) return null;
    return { data: parsed.data as T, updatedAt: parsed.timestamp };
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota / private mode
  }
}

function sessionSeedOptions<T>(baseId: number | null, sessionKey: string) {
  if (!baseId || typeof window === "undefined") return {};
  const seeded = readSessionJson<T>(sessionKey);
  if (!seeded) return {};
  return { initialData: seeded.data, initialDataUpdatedAt: seeded.updatedAt };
}

export function useDashboardAnalyticsQuery(baseId: number | null) {
  const key = baseId ?? 0;
  const sessionKey = `sparkai:dashboard:analytics:${key}`;

  return useQuery({
    queryKey: ["analytics", "dashboard", baseId] as const,
    enabled: Boolean(baseId),
    staleTime: KPI_QUERY_STALE_MS,
    refetchInterval: refetchIntervalWhenVisible(20_000),
    ...sessionSeedOptions<any>(baseId, sessionKey),
    queryFn: async () => {
      const data = await apiRequest(`/analytics?base_id=${baseId}`);
      writeSessionJson(sessionKey, data);
      return data;
    },
  });
}

export function useDashboardStatsQuery(baseId: number | null) {
  const key = baseId ?? 0;
  const sessionKey = `${STATS_SESSION_PREFIX}${key}`;

  return useQuery({
    queryKey: ["dashboard-stats", baseId] as const,
    enabled: Boolean(baseId),
    staleTime: KPI_QUERY_STALE_MS,
    refetchInterval: refetchIntervalWhenVisible(20_000),
    ...sessionSeedOptions<DashboardStatsResponse>(baseId, sessionKey),
    queryFn: async () => {
      const data = (await apiRequest(`/dashboard/stats?base_id=${baseId}`)) as DashboardStatsResponse;
      writeSessionJson(sessionKey, data);
      return data;
    },
  });
}
