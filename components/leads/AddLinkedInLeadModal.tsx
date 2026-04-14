"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { importModalOverlayStyle } from "@/components/leads/ImportModalChrome";

type AddLinkedInLeadModalProps = {
  open: boolean;
  onClose: () => void;
  baseId: number;
  onCreated: (lead: unknown) => void;
};

export function AddLinkedInLeadModal({ open, onClose, baseId, onCreated }: AddLinkedInLeadModalProps) {
  const { showSuccess, showError } = useNotification();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      showError("LinkedIn URL required", "Paste a profile URL (linkedin.com/in/…).");
      return;
    }
    if (!/linkedin\.com\/in\//i.test(trimmed)) {
      showError("Invalid URL", "Use a LinkedIn profile link, e.g. https://www.linkedin.com/in/username");
      return;
    }
    setBusy(true);
    try {
      const res = (await api.createLeadFromLinkedIn(baseId, trimmed)) as { lead?: unknown };
      const lead = res?.lead;
      if (lead) {
        showSuccess("Lead added", "Profile fetched from LinkedIn and saved to this workspace.");
        onCreated(lead);
        onClose();
      } else {
        showError("Unexpected response", "No lead returned from the server.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      showError("Could not add lead", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={importModalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(90vh, 560px)",
          background: "var(--color-surface)",
          borderRadius: 16,
          border: "1px solid var(--elev-border, var(--color-border))",
          boxShadow: "var(--elev-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-li-title"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--elev-border, var(--color-border))",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(10, 102, 194, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.Linkedin size={22} strokeWidth={1.5} style={{ color: "#0A66C2" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="add-li-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                Add from LinkedIn
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Paste a profile URL. We match it with Apollo, then add research insights (same pipeline as AI-generated
                leads). Requires an Apollo API key for this workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--elev-border, var(--color-border))",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.04em" }}>
            LinkedIn profile URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/username"
            disabled={busy}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--elev-border, var(--color-border))",
              background: "var(--elev-bg, var(--color-surface-secondary))",
              color: "var(--color-text)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) void submit();
            }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={busy}
              style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void submit()}
              disabled={busy}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {busy ? (
                <>
                  <Icons.Loader size={16} className="animate-spin" strokeWidth={2} />
                  Fetching…
                </>
              ) : (
                <>
                  <Icons.Sparkles size={16} strokeWidth={1.5} />
                  Add lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
