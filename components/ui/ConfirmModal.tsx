"use client";

import React, { useId } from "react";
import { Icons } from "@/components/ui/Icons";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

/**
 * Single warning/confirm dialog style used across the portal (dark panel, tight border).
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  busy,
}: ConfirmModalProps) {
  const titleId = useId();
  if (!open) return null;

  const confirmBg = variant === "danger" ? "#dc2626" : "var(--color-primary)";
  const confirmColor = variant === "danger" ? "#fff" : "#fff";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        zIndex: 6000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={() => !busy && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          background: "var(--elev-bg, var(--color-surface))",
          border: "0.5px solid var(--elev-border, var(--color-border))",
          borderRadius: 12,
          padding: 22,
          boxShadow: "var(--elev-shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: variant === "danger" ? "rgba(248,113,113,0.12)" : "rgba(99,102,241,0.12)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icons.AlertCircle
              size={20}
              strokeWidth={1.5}
              style={{ color: variant === "danger" ? "#f87171" : "#a5b4fc" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px 0", color: "var(--color-text)" }}>
              {title}
            </h2>
            <div style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" className="btn-ghost" style={{ borderRadius: 8, padding: "9px 16px" }} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              borderRadius: 8,
              padding: "9px 16px",
              fontWeight: 600,
              border: "none",
              background: confirmBg,
              color: confirmColor,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {busy ? <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
