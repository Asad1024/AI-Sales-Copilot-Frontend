"use client";

import React from "react";

export type EmptyStateBannerProps = {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  /** Primary / secondary controls — buttons, links, or fragments */
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Shared empty state matching Workspaces (`/bases`): centered icon tile, title, body, optional action row.
 */
export default function EmptyStateBanner({
  icon,
  title,
  description,
  actions,
  className,
  style,
}: EmptyStateBannerProps) {
  return (
    <div
      className={className}
      style={{
        textAlign: "center",
        padding: "80px 20px",
        background: "var(--color-surface)",
        borderRadius: 12,
        border: "1px solid var(--elev-border)",
        ...style,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 20px",
          borderRadius: 16,
          background: "var(--color-surface-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          margin: "0 0 8px 0",
          color: "var(--color-text)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontSize: 14,
          color: "var(--color-text-muted)",
          margin: "0 0 24px 0",
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
      {actions ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
