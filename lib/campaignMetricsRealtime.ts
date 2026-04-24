import type { Socket } from "socket.io-client";

export type CampaignMetricsPayload = {
  campaign_id: number;
  event_type: string;
  lead_id?: number;
  timestamp: string;
  base_id?: number;
};

const campaignMetricsListeners = new Set<(payload: CampaignMetricsPayload) => void>();

function fanOutCampaignMetrics(raw: unknown) {
  const p = raw as CampaignMetricsPayload;
  if (!p || typeof p.campaign_id !== "number") return;
  campaignMetricsListeners.forEach((cb) => {
    try {
      cb(p);
    } catch (e) {
      console.error("[WebSocket] campaign:metrics:update listener error:", e);
    }
  });
}

/** Attach relay to the shared Socket.IO client (used from websocketClient). */
export function bindCampaignMetricsRelay(sock: Socket | null): void {
  if (!sock) return;
  sock.off("campaign:metrics:update", fanOutCampaignMetrics);
  sock.on("campaign:metrics:update", fanOutCampaignMetrics);
}

export function unbindCampaignMetricsRelay(sock: Socket | null): void {
  if (!sock) return;
  sock.off("campaign:metrics:update", fanOutCampaignMetrics);
}

export function clearCampaignMetricsListeners(): void {
  campaignMetricsListeners.clear();
}

/**
 * Subscribe to server `campaign:metrics:update` on the shared notification socket.
 * Uses a dynamic import of `./websocketClient` to avoid circular module graphs (which can
 * surface in Next/Webpack as `onCampaignMetricsUpdate is not a function`).
 */
export function onCampaignMetricsUpdate(callback: (payload: CampaignMetricsPayload) => void): void {
  campaignMetricsListeners.add(callback);
  void import("./websocketClient").then(({ initializeWebSocket }) => {
    void initializeWebSocket().then((s) => {
      if (s) bindCampaignMetricsRelay(s);
    });
  });
}

export function offCampaignMetricsUpdate(callback?: (payload: CampaignMetricsPayload) => void): void {
  if (callback) {
    campaignMetricsListeners.delete(callback);
    return;
  }
  campaignMetricsListeners.clear();
}
