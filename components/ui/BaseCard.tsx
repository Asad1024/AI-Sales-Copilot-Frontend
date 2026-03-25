"use client";

import React from "react";

interface BaseCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export default function BaseCard({ children, style, onClick, className, onMouseEnter, onMouseLeave }: BaseCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: "var(--elev-bg, var(--color-surface))",
        border: "0.5px solid var(--elev-border, var(--color-border))",
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

