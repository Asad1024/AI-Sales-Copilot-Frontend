"use client";

import { useEffect, useCallback } from "react";
import { Lock } from "lucide-react";
import { Icons } from "@/components/ui/Icons";

const DOT = 28;
const RING = 2.5;
const RING_PAD = 2;

type FirstWorkspaceSuccessModalProps = {
  open: boolean;
  workspaceName: string;
  onAddLeads: () => void;
  onViewDashboard: () => void;
};

function StepDot({
  variant,
  stepNumber,
}: {
  variant: "done" | "current" | "locked";
  stepNumber: 1 | 2;
}) {
  const isDone = variant === "done";
  const isCurrent = variant === "current";
  return (
    <div
      style={{
        padding: RING_PAD,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          width: DOT,
          height: DOT,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          boxSizing: "border-box",
          border: isDone
            ? "none"
            : isCurrent
              ? `${Math.round(RING)}px solid var(--color-primary, #2563EB)`
              : "1px solid #E5E7EB",
          background: isDone ? "#059669" : isCurrent ? "rgba(37, 99, 235, 0.08)" : "#F9FAFB",
          color: isDone ? "#FFFFFF" : isCurrent ? "var(--color-primary, #2563EB)" : "#9CA3AF",
          boxShadow: isCurrent ? "0 0 0 4px rgba(37, 99, 235, 0.2)" : "none",
        }}
      >
        {isDone ? (
          <Icons.Check size={15} strokeWidth={2.5} />
        ) : variant === "locked" ? (
          <Lock strokeWidth={2.25} size={13} style={{ color: "#94A3B8" }} aria-hidden />
        ) : (
          stepNumber
        )}
      </div>
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  const lineH = 2;
  const marginTop = RING_PAD + DOT / 2 - lineH / 2;
  return (
    <div
      aria-hidden
      style={{
        flex: 1,
        minWidth: 12,
        height: lineH,
        marginTop,
        borderRadius: 2,
        background: done ? "#059669" : "#E5E7EB",
        alignSelf: "flex-start",
      }}
    />
  );
}

export function FirstWorkspaceSuccessModal({
  open,
  workspaceName,
  onAddLeads,
  onViewDashboard,
}: FirstWorkspaceSuccessModalProps) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onAddLeads();
      }
    },
    [open, onAddLeads],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  if (!open) return null;

  const name = workspaceName.trim() || "Your workspace";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-ws-modal-title"
      aria-describedby="first-ws-modal-desc"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onAddLeads();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "28px 24px 24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.12) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
            }}
          >
            <Icons.Folder size={24} strokeWidth={1.75} />
          </div>
          <h2
            id="first-ws-modal-title"
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--color-text)",
              margin: "0 0 8px",
              lineHeight: 1.3,
            }}
          >
            Your workspace is ready
          </h2>
          <p
            id="first-ws-modal-desc"
            style={{
              fontSize: 14,
              color: "var(--color-text-muted)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            <strong style={{ color: "var(--color-text)" }}>{name}</strong> is set up. Next, add the people you want to
            reach—you&apos;ll run campaigns and enrichment from this list.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 0,
            marginBottom: 8,
            padding: "12px 8px 4px",
          }}
        >
          <StepDot variant="done" stepNumber={1} />
          <Connector done />
          <StepDot variant="current" stepNumber={2} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 4px 20px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span style={{ width: DOT + RING_PAD * 2, textAlign: "center" }}>Workspace</span>
          <span style={{ flex: 1 }} />
          <span style={{ width: DOT + RING_PAD * 2, textAlign: "center" }}>Add leads</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
            }}
            onClick={onAddLeads}
          >
            Add leads
          </button>
          <button
            type="button"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "11px 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
            onClick={onViewDashboard}
          >
            View dashboard
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", margin: "14px 0 0", lineHeight: 1.45 }}>
          You&apos;re on <strong style={{ color: "var(--color-text)" }}>Leads</strong> — add contacts from the toolbar, or
          open the dashboard to see your overall progress.
        </p>
      </div>
    </div>
  );
}
