"use client";
import React, { useEffect } from "react";
import { Icons } from "./Icons";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: string[];
  duration?: number; // Auto-close duration in ms (0 = no auto-close)
  onClose?: () => void;
}

interface NotificationDialogProps {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationDialog: React.FC<NotificationDialogProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification && notification.duration !== undefined && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getTypeConfig = () => {
    switch (notification.type) {
      case "success":
        return {
          gradient: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
          iconBg: "rgba(255,255,255,0.2)",
          icon: <Icons.CheckCircle size={32} />,
          iconColor: "white",
          borderColor: "rgba(76, 175, 80, 0.4)",
        };
      case "error":
        return {
          gradient: "linear-gradient(135deg, #ff5757 0%, #ff4444 100%)",
          iconBg: "rgba(255,255,255,0.2)",
          icon: <Icons.AlertCircle size={32} />,
          iconColor: "white",
          borderColor: "rgba(255, 87, 87, 0.4)",
        };
      case "warning":
        return {
          gradient: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
          iconBg: "rgba(255,255,255,0.2)",
          icon: <Icons.AlertCircle size={32} />,
          iconColor: "white",
          borderColor: "rgba(255, 152, 0, 0.4)",
        };
      case "info":
        return {
          gradient: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
          iconBg: "rgba(255,255,255,0.2)",
          icon: <Icons.Info size={32} />,
          iconColor: "white",
          borderColor: "rgba(76, 103, 255, 0.4)",
        };
    }
  };

  const config = getTypeConfig();

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.7)",
          backdropFilter: "blur(8px)",
          zIndex: 5000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          animation: "fadeIn 0.3s ease-out",
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: "min(550px, 90vw)",
            background: "var(--elev-bg)",
            border: `2px solid ${config.borderColor}`,
            borderRadius: 24,
            padding: 0,
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.1)",
            animation: "slideUp 0.4s ease-out",
            overflow: "hidden",
            position: "relative",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated background particles */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 20% 30%, ${config.borderColor.replace("0.4", "0.15")} 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, ${config.borderColor.replace("0.4", "0.15")} 0%, transparent 50%)`,
              animation: "pulse 3s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div
            style={{
              background: config.gradient,
              padding: "28px 32px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: config.iconBg,
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    color: config.iconColor,
                    flexShrink: 0,
                  }}
                >
                  {config.icon}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    lineHeight: 1.2,
                  }}
                >
                  {notification.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                <Icons.X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              padding: "28px 32px",
              background: "var(--elev-bg)",
              overflowY: "auto",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                marginBottom: notification.details && notification.details.length > 0 ? 20 : 0,
              }}
            >
              {notification.message}
            </div>

            {/* Details list */}
            {notification.details && notification.details.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 20px",
                  background:
                    notification.type === "error"
                      ? "rgba(255, 87, 87, 0.1)"
                      : notification.type === "warning"
                      ? "rgba(255, 152, 0, 0.1)"
                      : "rgba(76, 103, 255, 0.1)",
                  border: `2px solid ${
                    notification.type === "error"
                      ? "rgba(255, 87, 87, 0.3)"
                      : notification.type === "warning"
                      ? "rgba(255, 152, 0, 0.3)"
                      : "rgba(76, 103, 255, 0.3)"
                  }`,
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 12,
                    fontSize: 14,
                    color:
                      notification.type === "error"
                        ? "#ff5757"
                        : notification.type === "warning"
                        ? "#ff9800"
                        : "var(--text-primary)",
                  }}
                >
                  {notification.type === "error" ? "Errors:" : "Details:"}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {notification.details.map((detail, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color:
                            notification.type === "error"
                              ? "#ff5757"
                              : notification.type === "warning"
                              ? "#ff9800"
                              : "var(--text-primary)",
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      >
                        •
                      </span>
                      <span style={{ flex: 1 }}>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "20px 32px",
              background: "var(--elev-bg)",
              borderTop: "1px solid var(--elev-border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(76, 103, 255, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(76, 103, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 103, 255, 0.3)";
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationDialog;
