import type { BaseMemberRole } from "@/hooks/useBasePermissions";

/**
 * Canonical workspace membership roles (stored values).
 * Invite flow uses three: Workspace admin, Contributor, Viewer (+ Owner via transfer only).
 */
export const WORKSPACE_ROLE_LABEL: Record<BaseMemberRole, string> = {
  owner: "Owner",
  admin: "Workspace admin",
  editor: "Contributor",
  viewer: "Viewer",
  member: "Contributor (limited)",
};

/** Roles that can be chosen when inviting by email (exactly three). */
export const INVITE_WORKSPACE_ROLES: readonly BaseMemberRole[] = ["admin", "editor", "viewer"];
export type InviteWorkspaceRole = (typeof INVITE_WORKSPACE_ROLES)[number];

export interface WorkspaceRoleOption {
  value: BaseMemberRole;
  label: string;
  description: string;
}

/** Full list for team table role dropdown (includes Owner + legacy `member`). */
export const ALL_WORKSPACE_ROLE_OPTIONS: WorkspaceRoleOption[] = [
  {
    value: "owner",
    label: "Owner",
    description: "Full control of the workspace. Use only when transferring ownership.",
  },
  {
    value: "admin",
    label: "Workspace admin",
    description: "Manage members, schema, settings, integrations. Full leads & campaigns access.",
  },
  {
    value: "editor",
    label: "Contributor",
    description: "Leads & campaigns: create, edit, assign, delete, run. Cannot manage workspace.",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read and export only.",
  },
  {
    value: "member",
    label: "Contributor (limited) — legacy",
    description: "Legacy: cannot assign or delete leads. Prefer Contributor when changing role.",
  },
];

/** Subset for Invite modal and new-member defaults (three roles). */
export const INVITE_WORKSPACE_ROLE_OPTIONS: WorkspaceRoleOption[] = ALL_WORKSPACE_ROLE_OPTIONS.filter((o) =>
  (INVITE_WORKSPACE_ROLES as readonly string[]).includes(o.value)
);

export function getWorkspaceRoleLabel(role: BaseMemberRole | null | undefined): string {
  if (!role) return "—";
  return WORKSPACE_ROLE_LABEL[role] ?? role;
}
