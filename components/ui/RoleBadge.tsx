"use client";
import { BaseMemberRole } from "@/hooks/useBasePermissions";
import { WORKSPACE_ROLE_LABEL } from "@/lib/workspaceRoles";

interface RoleBadgeProps {
  role: BaseMemberRole | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const roleConfig: Record<BaseMemberRole, { color: string; bgColor: string; icon: string }> = {
  owner: {
    color: "#ff6b6b",
    bgColor: "rgba(255, 107, 107, 0.15)",
    icon: "👑"
  },
  admin: {
    color: "#7C3AED",
    bgColor: "rgba(124, 58, 237, 0.15)",
    icon: "⚡"
  },
  editor: {
    color: "#4ecdc4",
    bgColor: "rgba(78, 205, 196, 0.15)",
    icon: "✏️"
  },
  viewer: {
    color: "#888",
    bgColor: "rgba(136, 136, 136, 0.15)",
    icon: "👁️"
  },
  member: {
    color: "#ffa726",
    bgColor: "rgba(255, 167, 38, 0.15)",
    icon: "👤"
  },
};

export function RoleBadge({ role, size = "md", showLabel = true, className = "" }: RoleBadgeProps) {
  if (!role) return null;

  const config = roleConfig[role];
  const label = WORKSPACE_ROLE_LABEL[role];
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
      title={`Role: ${label}`}
    >
      <span style={{ fontSize: style.iconSize }}>{config.icon}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}

