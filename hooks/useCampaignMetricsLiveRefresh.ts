"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  onCampaignMetricsUpdate,
  offCampaignMetricsUpdate,
  type CampaignMetricsPayload,
} from "@/lib/campaignMetricsRealtime";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useNotification } from "@/context/NotificationContext";

const TOAST_MIN_MS = 4000;

/**
 * When the server emits `campaign:metrics:update` (webhooks, worker, etc.), refresh the
 * campaign row in Zustand, invalidate dashboard / campaign KPI queries, and optionally toast.
 *
 * `activeWorkspaceId`: join Socket.IO `base:{id}` for the workspace you are viewing so teammates
 * (non-owner) still receive emits; also used to refresh header credits when payloads include `base_id`.
 */
export function useCampaignMetricsLiveRefresh(options?: {
  enabled?: boolean;
  showToast?: boolean;
  activeWorkspaceId?: number | null;
}) {
  const enabled = options?.enabled !== false;
  const showToast = options?.showToast !== false;
  const activeWorkspaceId = options?.activeWorkspaceId ?? null;
  const queryClient = useQueryClient();
  const refreshCampaign = useCampaignStore((s) => s.refreshCampaign);
  const { showSuccess } = useNotification();
  const lastToastByCampaignRef = useRef<Record<number, number>>({});

  /** Metrics are emitted to `user:owner` and `base:{id}` — ensure this tab is in the workspace room. */
  useEffect(() => {
    if (!enabled) return;
    if (activeWorkspaceId == null || !Number.isFinite(activeWorkspaceId) || activeWorkspaceId < 1) {
      return;
    }
    let cancelled = false;
    void import("@/lib/websocketClient").then(({ initializeWebSocket, syncWebSocketWorkspaceRoom }) => {
      void initializeWebSocket().then(() => {
        if (cancelled) return;
        syncWebSocketWorkspaceRoom(activeWorkspaceId);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, activeWorkspaceId]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (data: CampaignMetricsPayload) => {
      void refreshCampaign(data.campaign_id);
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["campaigns-stats"] });

      const bid =
        data.base_id != null && Number.isFinite(Number(data.base_id)) && Number(data.base_id) > 0
          ? Number(data.base_id)
          : NaN;
      if (typeof window !== "undefined" && Number.isFinite(bid)) {
        window.dispatchEvent(
          new CustomEvent("sparkai:workspace-credits-changed", { detail: { baseId: bid } })
        );
      }

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
