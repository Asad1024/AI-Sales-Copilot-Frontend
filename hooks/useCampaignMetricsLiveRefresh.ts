"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onCampaignMetricsUpdate, offCampaignMetricsUpdate } from "@/lib/campaignMetricsRealtime";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useNotification } from "@/context/NotificationContext";

const TOAST_MIN_MS = 4000;

/**
 * When the server emits `campaign:metrics:update` (webhooks, worker, etc.), refresh the
 * campaign row in Zustand, invalidate dashboard / campaign KPI queries, and optionally toast.
 */
export function useCampaignMetricsLiveRefresh(options?: { enabled?: boolean; showToast?: boolean }) {
  const enabled = options?.enabled !== false;
  const showToast = options?.showToast !== false;
  const queryClient = useQueryClient();
  const refreshCampaign = useCampaignStore((s) => s.refreshCampaign);
  const { showSuccess } = useNotification();
  const lastToastByCampaignRef = useRef<Record<number, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const handler = (data: { campaign_id: number }) => {
      void refreshCampaign(data.campaign_id);
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["campaigns-stats"] });

      if (showToast) {
        const now = Date.now();
        const last = lastToastByCampaignRef.current[data.campaign_id] ?? 0;
        if (now - last >= TOAST_MIN_MS) {
          lastToastByCampaignRef.current[data.campaign_id] = now;
          showSuccess("Campaign updated", "Latest activity is reflected in this workspace.");
        }
      }
    };

    onCampaignMetricsUpdate(handler);
    return () => offCampaignMetricsUpdate(handler);
  }, [enabled, showToast, queryClient, refreshCampaign, showSuccess]);
}
