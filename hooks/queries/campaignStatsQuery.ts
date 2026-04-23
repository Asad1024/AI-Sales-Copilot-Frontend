import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import type { CampaignsStatsResponse } from "@/lib/kpiStatsApi";
import { KPI_QUERY_STALE_MS, KPI_REFETCH_INTERVAL_MS, refetchIntervalWhenVisible } from "./kpiQueryDefaults";

const SESSION_PREFIX = "sparkai:campaigns:stats:";

function readSession(baseId: number): { data: CampaignsStatsResponse; updatedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${baseId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: CampaignsStatsResponse; timestamp?: number };
    if (!parsed?.data || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > KPI_QUERY_STALE_MS) return null;
    return { data: parsed.data, updatedAt: parsed.timestamp };
  } catch {
    return null;
  }
}

function writeSession(baseId: number, data: CampaignsStatsResponse) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${baseId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore
  }
}

function seed(baseId: number | null) {
  if (!baseId) return {};
  const s = readSession(baseId);
  if (!s) return {};
  return { initialData: s.data, initialDataUpdatedAt: s.updatedAt };
}

export function useCampaignsStatsQuery(baseId: number | null) {
  return useQuery({
    queryKey: ["campaigns-stats", baseId] as const,
    enabled: Boolean(baseId),
    staleTime: KPI_QUERY_STALE_MS,
    refetchInterval: refetchIntervalWhenVisible(KPI_REFETCH_INTERVAL_MS),
    ...seed(baseId),
    queryFn: async () => {
      const data = (await apiRequest(`/campaigns/stats?base_id=${baseId}`)) as CampaignsStatsResponse;
      if (baseId) writeSession(baseId, data);
      return data;
    },
  });
}
