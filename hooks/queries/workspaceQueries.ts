import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import type { WorkspacesStatsResponse } from "@/lib/kpiStatsApi";
import { KPI_QUERY_STALE_MS, KPI_REFETCH_INTERVAL_MS, refetchIntervalWhenVisible } from "./kpiQueryDefaults";

export function useWorkspacesStatsQuery() {
  return useQuery({
    queryKey: ["workspaces-stats"] as const,
    staleTime: KPI_QUERY_STALE_MS,
    refetchInterval: refetchIntervalWhenVisible(KPI_REFETCH_INTERVAL_MS),
    queryFn: async () => (await apiRequest("/workspaces/stats")) as WorkspacesStatsResponse,
  });
}

type QuickStatsPayload = { stats: Record<number, { leads: number; campaigns: number; enriched: number; scored: number }> };

export function useBasesQuickStatsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["bases-quick-stats"] as const,
    enabled,
    staleTime: KPI_QUERY_STALE_MS,
    refetchInterval: refetchIntervalWhenVisible(KPI_REFETCH_INTERVAL_MS),
    queryFn: async () => (await apiRequest("/bases/quick-stats")) as QuickStatsPayload,
  });
}
