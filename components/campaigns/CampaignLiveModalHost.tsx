"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import {
  onCampaignLive,
  offCampaignLive,
  type CampaignLivePayload,
} from "@/lib/websocketClient";

/**
 * Listens for `campaign:live` from the API when a scheduled (or immediate) run
 * actually starts sending. Shows a short confirmation modal.
 */
export function CampaignLiveModalHost() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<CampaignLivePayload | null>(null);

  useEffect(() => {
    const cb = (p: CampaignLivePayload) => {
      setPayload(p);
      setOpen(true);
    };
    void onCampaignLive(cb);
    return () => offCampaignLive(cb);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  const goToCampaign = useCallback(() => {
    if (payload?.campaign_id) {
      router.push(`/campaigns/${payload.campaign_id}`);
    }
    close();
  }, [router, payload, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !payload) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-live-title"
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          background: "var(--color-surface, #fff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          padding: "24px 22px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(var(--color-primary-rgb, 59, 130, 246), 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Rocket size={22} style={{ color: "var(--color-primary, #2563eb)" }} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id="campaign-live-title"
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-text)",
                lineHeight: 1.3,
              }}
            >
              Your campaign is live
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--color-text-muted, #64748b)",
              }}
            >
              <strong style={{ color: "var(--color-text)" }}>{payload.campaign_name}</strong> is now
              running and messages are being sent for the channels you selected.
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 22,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={close}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--color-border, #e5e7eb)",
              background: "transparent",
              color: "var(--color-text)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
          <button
            type="button"
            onClick={goToCampaign}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-primary, #2563eb)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            View campaign
          </button>
        </div>
      </div>
    </div>
  );
}
