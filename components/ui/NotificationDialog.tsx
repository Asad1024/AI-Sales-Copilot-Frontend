"use client";

import React, { useEffect, useId } from "react";
import { Icons } from "./Icons";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: string[];
  duration?: number;
  onClose?: () => void;
}

interface NotificationDialogProps {
  notification: Notification | null;
  onClose: () => void;
}

/** Bottom-right toast (no blocking overlay). Same notification API as before. */
const NotificationDialog: React.FC<NotificationDialogProps> = ({ notification, onClose }) => {
  const titleId = useId();

  useEffect(() => {
    if (notification && notification.duration !== undefined && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const accent =
    notification.type === "success"
      ? "#4ade80"
      : notification.type === "error"
      ? "#f87171"
      : notification.type === "warning"
      ? "#fb923c"
      : "#eeab7a";

  const Icon =
    notification.type === "success"
      ? Icons.CheckCircle
      : notification.type === "info"
      ? Icons.Info
      : Icons.AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-labelledby={titleId}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 5000,
        width: "min(400px, calc(100vw - 40px))",
        maxHeight: "min(320px, 45vh)",
        display: "flex",
        flexDirection: "column",
        background: "var(--elev-bg, var(--color-surface))",
        border: "0.5px solid var(--elev-border, var(--color-border))",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        boxShadow: "var(--elev-shadow-lg)",
        overflow: "hidden",
      }}
      className="portal-toast"
    >
      <div style={{ display: "flex", gap: 12, padding: "14px 16px", alignItems: "flex-start", minHeight: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
            flexShrink: 0,
          }}
        >
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id={titleId} style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 4, lineHeight: 1.3 }}>
            {notification.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
            {notification.message}
          </div>
          {notification.details && notification.details.length > 0 ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--color-text-muted)" }}>
              {notification.details.map((d, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {d}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="header-utility-btn"
          style={{
            borderRadius: 8,
            padding: 6,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icons.X size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default NotificationDialog;
