"use client";

import type { CSSProperties, ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";

export const importModalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
  backdropFilter: "blur(8px)",
};

export function ImportModalLoadingPanel({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 16,
        borderRadius: 16,
        border: "1px dashed var(--color-border)",
        background: "var(--color-surface-secondary)",
      }}
    >
      <div className="ui-spinner-ring" aria-hidden />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)" }}>{title}</p>
    </div>
  );
}

export type ImportStepDef = { key: string; label: string };

export function ImportModalStepper({ steps, activeKey }: { steps: ImportStepDef[]; activeKey: string }) {
  const idx = steps.findIndex((s) => s.key === activeKey);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
        padding: "4px 0",
      }}
    >
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const last = i === steps.length - 1;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: last ? "0 0 auto" : 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  background: active
                    ? "linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)"
                    : done
                      ? "rgba(124, 58, 237, 0.2)"
                      : "var(--color-surface-secondary)",
                  color: active ? "#fff" : done ? "var(--color-primary)" : "var(--color-text-muted)",
                  border: active || done ? "none" : "1px solid var(--color-border)",
                  boxShadow: active ? "0 4px 14px rgba(124, 58, 237, 0.3)" : "none",
                }}
              >
                {done ? <Icons.Check size={16} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--color-text)" : "var(--color-text-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                {s.label}
              </span>
            </div>
            {!last ? (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 6px 22px",
                  borderRadius: 1,
                  background: done ? "linear-gradient(90deg, rgba(99,102,241,0.45), rgba(124, 58, 237,0.25))" : "var(--color-border)",
                  minWidth: 8,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type ImportModalFrameProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** CSS background for header strip (e.g. brand-tinted gradient) */
  headerTint: string;
  icon: ReactNode;
  /** Default 560; CSV wizard uses 640 */
  maxWidth?: number;
  /** Stepper rendered below header, above scroll body */
  stepper?: ReactNode;
  children: ReactNode;
  /** Wider panel (e.g. 900 for CSV) */
  wide?: boolean;
  /** When true, overlay / header close do nothing (e.g. long-running job) */
  closeDisabled?: boolean;
  /** Panel max height (CSV wizard needs more vertical room) */
  maxModalHeight?: string;
};

export function ImportModalFrame({
  open,
  onClose,
  title,
  subtitle,
  headerTint,
  icon,
  maxWidth = 560,
  wide = false,
  stepper,
  children,
  closeDisabled = false,
  maxModalHeight = "min(90vh, 720px)",
}: ImportModalFrameProps) {
  if (!open) return null;

  const tryClose = () => {
    if (closeDisabled) return;
    onClose();
  };

  return (
    <div style={importModalOverlayStyle} onClick={tryClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-frame-title"
        className="card-enhanced"
        style={{
          borderRadius: 22,
          maxWidth: wide ? Math.max(maxWidth, 900) : maxWidth,
          width: "100%",
          maxHeight: maxModalHeight,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 25px 80px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--color-border-light)",
            background: headerTint,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  id="import-modal-frame-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--color-text)",
                    lineHeight: 1.25,
                  }}
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>{subtitle}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={tryClose}
              disabled={closeDisabled}
              aria-label="Close"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: closeDisabled ? "not-allowed" : "pointer",
                flexShrink: 0,
                color: "var(--color-text-muted)",
                opacity: closeDisabled ? 0.45 : 1,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (closeDisabled) return;
                e.currentTarget.style.background = "var(--color-surface-secondary)";
                e.currentTarget.style.color = "var(--color-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-surface)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              <Icons.X size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {stepper ? (
          <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
            {stepper}
          </div>
        ) : null}

        <div
          style={{
            padding: stepper ? "8px 24px 24px" : "0 24px 24px",
            paddingTop: stepper ? 8 : 24,
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
