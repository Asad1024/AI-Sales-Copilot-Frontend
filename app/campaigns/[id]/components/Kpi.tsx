import type { ComponentType, CSSProperties } from "react";

interface KpiProps {
  title: string;
  value: number | string;
  icon?: ComponentType<{ size?: number; strokeWidth?: number | string; style?: CSSProperties }>;
}

export function Kpi({ title, value, icon }: KpiProps) {
  const IconComponent = icon;

  return (
    <div
      style={{
        padding: "18px 16px",
        borderRadius: 14,
        textAlign: "center",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 2px var(--color-shadow)",
        boxSizing: "border-box",
      }}
    >
      {IconComponent && (
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(37, 99, 235, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(37, 99, 235, 0.18)",
            }}
          >
            <IconComponent size={22} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
          </div>
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          marginBottom: 6,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--color-text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
