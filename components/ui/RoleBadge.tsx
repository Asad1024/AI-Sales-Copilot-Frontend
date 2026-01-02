"use client";
import { BaseMemberRole } from "@/hooks/useBasePermissions";

interface RoleBadgeProps {
  role: BaseMemberRole | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const roleConfig: Record<BaseMemberRole, { label: string; color: string; bgColor: string; icon: string }> = {
  owner: {
    label: "Owner",
    color: "#ff6b6b",
    bgColor: "rgba(255, 107, 107, 0.15)",
    icon: "👑"
  },
  admin: {
    label: "Admin",
    color: "#4C67FF",
    bgColor: "rgba(76, 103, 255, 0.15)",
    icon: "⚡"
  },
  editor: {
    label: "Editor",
    color: "#4ecdc4",
    bgColor: "rgba(78, 205, 196, 0.15)",
    icon: "✏️"
  },
  viewer: {
    label: "Viewer",
    color: "#888",
    bgColor: "rgba(136, 136, 136, 0.15)",
    icon: "👁️"
  },
  member: {
    label: "Member",
    color: "#ffa726",
    bgColor: "rgba(255, 167, 38, 0.15)",
    icon: "👤"
  },
};

export function RoleBadge({ role, size = "md", showLabel = true, className = "" }: RoleBadgeProps) {
  if (!role) return null;

  const config = roleConfig[role];
  const sizeStyles = {
    sm: { padding: "4px 8px", fontSize: "11px", iconSize: "12px" },
    md: { padding: "6px 12px", fontSize: "12px", iconSize: "14px" },
    lg: { padding: "8px 16px", fontSize: "14px", iconSize: "16px" },
  };

  const style = sizeStyles[size];

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: style.padding,
        background: config.bgColor,
        color: config.color,
        borderRadius: "8px",
        fontSize: style.fontSize,
        fontWeight: "600",
        border: `1px solid ${config.color}40`,
        lineHeight: 1,
      }}
      title={`Role: ${config.label}`}
    >
      <span style={{ fontSize: style.iconSize }}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

