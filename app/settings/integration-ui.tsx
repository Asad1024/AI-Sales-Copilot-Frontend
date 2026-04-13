"use client";

import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Icons } from "@/components/ui/Icons";

export type IntegrationStatusVariant = "connected" | "not_connected" | "coming_soon" | "server_configured";

const CARD_MIN_HEIGHT = 110;

const cardShell: CSSProperties = {
  position: "relative",
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
  minHeight: CARD_MIN_HEIGHT,
  padding: 16,
  borderRadius: 12,
  background: "#ffffff",
  border: "1px solid #EEECF8",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

export function StatusBadge({ variant }: { variant: IntegrationStatusVariant }) {
  if (variant === "connected") {
    return (
      <span
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          color: "#15803D",
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: 9999,
          padding: "2px 10px",
          whiteSpace: "nowrap",
        }}
      >
        ● Connected
      </span>
    );
  }
  if (variant === "coming_soon") {
    return (
      <span
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          color: "#9CA3AF",
          background: "#F3F4F6",
          borderRadius: 9999,
          padding: "2px 10px",
          whiteSpace: "nowrap",
        }}
      >
        Coming soon
      </span>
    );
  }
  if (variant === "server_configured") {
    return (
      <span
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          color: "#1D4ED8",
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: 9999,
          padding: "2px 10px",
          whiteSpace: "nowrap",
        }}
      >
        Server configured
      </span>
    );
  }
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 500,
        color: "#9CA3AF",
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: 9999,
        padding: "2px 10px",
        whiteSpace: "nowrap",
      }}
    >
      ○ Not connected
    </span>
  );
}

type IntegrationUniversalCardProps = {
  icon: ReactNode;
  name: string;
  subtitle: string;
  status: IntegrationStatusVariant;
  /** When true, entire card is dimmed and non-interactive */
  comingSoon?: boolean;
  actionRow?: ReactNode;
};

export function IntegrationUniversalCard({ icon, name, subtitle, status, comingSoon, actionRow }: IntegrationUniversalCardProps) {
  return (
    <div
      style={{
        ...cardShell,
        opacity: comingSoon ? 0.5 : 1,
        pointerEvents: comingSoon ? "none" : "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            className="rounded-lg"
          >
            {icon}
          </div>
          <div style={{ minWidth: 0, paddingRight: 4, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", lineHeight: 1.3 }}>{name}</div>
            <div
              style={{
                fontSize: 12,
                color: "#9CA3AF",
                marginTop: 2,
                lineHeight: 1.35,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={subtitle}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, alignSelf: "flex-start" }}>
          <StatusBadge variant={status} />
        </div>
      </div>
      {!comingSoon && actionRow ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            width: "100%",
            marginTop: 12,
            flexShrink: 0,
          }}
        >
          {actionRow}
        </div>
      ) : null}
    </div>
  );
}

export function RemoveIntegrationLink({
  onClick,
  label = "Remove",
  disabled,
}: {
  onClick: () => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className="border-0 bg-transparent p-0 text-xs font-medium text-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {label}
    </button>
  );
}

export function ConfigureLinkButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="btn-secondary-outline"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        padding: "8px 14px",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span>Configure</span>
      <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ flexShrink: 0, opacity: 0.9 }} />
    </button>
  );
}

export function ConnectFilledButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="btn-primary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        padding: "8px 16px",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

type ConfigureModalShellProps = {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  footer: ReactNode;
};

export function ConfigureModalShell({ open, onClose, icon, title, children, footer }: ConfigureModalShellProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(6px)",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          maxHeight: "min(90vh, 640px)",
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.12)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>{title}</h2>
          </div>
          <button type="button" className="icon-btn header-utility-btn" onClick={onClose} aria-label="Close" style={{ flexShrink: 0 }}>
            <Icons.X size={18} />
          </button>
        </div>
        {children}
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>{footer}</div>
      </div>
    </div>
  );
}

export function VaultEncryptedNote() {
  return (
    <p style={{ margin: "14px 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.45 }}>
      ● Vault encrypted — credentials are stored securely on the server.
    </p>
  );
}
