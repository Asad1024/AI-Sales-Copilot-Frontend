/**
 * Frontend Permission System
 * Mirrors backend permission structure for UI-level enforcement
 */

export type BaseMemberRole = "owner" | "admin" | "editor" | "viewer" | "member";

export type PermissionAction =
  | "leads:create"
  | "leads:read"
  | "leads:update"
  | "leads:delete"
  | "leads:assign"
  | "leads:export"
  | "campaigns:create"
  | "campaigns:read"
  | "campaigns:update"
  | "campaigns:delete"
  | "campaigns:execute"
  | "base:manageMembers"
  | "base:editSchema"
  | "base:manageViews"
  | "base:manageSettings"
  | "base:delete"
  | "integrations:connect"
  | "integrations:disconnect"
  | "platform:admin";

export interface BasePermissions {
  // Lead permissions
  canCreateLeads: boolean;
  canReadLeads: boolean;
  canUpdateLeads: boolean;
  canDeleteLeads: boolean;
  canAssignLeads: boolean;
  canExportLeads: boolean;

  // Campaign permissions
  canCreateCampaigns: boolean;
  canReadCampaigns: boolean;
  canUpdateCampaigns: boolean;
  canDeleteCampaigns: boolean;
  canExecuteCampaigns: boolean;

  // Base management permissions
  canManageMembers: boolean;
  canEditSchema: boolean;
  canManageViews: boolean;
  canManageSettings: boolean;
  canDeleteBase: boolean;

  // Integration permissions
  canConnectIntegrations: boolean;
  canDisconnectIntegrations: boolean;
}

/**
 * Default permissions for each role
 */
export const rolePermissions: Record<BaseMemberRole, BasePermissions> = {
  owner: {
    canCreateLeads: true,
    canReadLeads: true,
    canUpdateLeads: true,
    canDeleteLeads: true,
    canAssignLeads: true,
    canExportLeads: true,
    canCreateCampaigns: true,
    canReadCampaigns: true,
    canUpdateCampaigns: true,
    canDeleteCampaigns: true,
    canExecuteCampaigns: true,
    canManageMembers: true,
    canEditSchema: true,
    canManageViews: true,
    canManageSettings: true,
    canDeleteBase: true,
    canConnectIntegrations: true,
    canDisconnectIntegrations: true,
  },
  admin: {
    canCreateLeads: true,
    canReadLeads: true,
    canUpdateLeads: true,
    canDeleteLeads: true,
    canAssignLeads: true,
    canExportLeads: true,
    canCreateCampaigns: true,
    canReadCampaigns: true,
    canUpdateCampaigns: true,
    canDeleteCampaigns: true,
    canExecuteCampaigns: true,
    canManageMembers: true,
    canEditSchema: true,
    canManageViews: true,
    canManageSettings: true,
    canDeleteBase: false, // Only owner can delete base
    canConnectIntegrations: true,
    canDisconnectIntegrations: true,
  },
  editor: {
    canCreateLeads: true,
    canReadLeads: true,
    canUpdateLeads: true,
    canDeleteLeads: true,
    canAssignLeads: true,
    canExportLeads: true,
    canCreateCampaigns: true,
    canReadCampaigns: true,
    canUpdateCampaigns: true,
    canDeleteCampaigns: false,
    canExecuteCampaigns: true,
    canManageMembers: false,
    canEditSchema: false,
    canManageViews: true,
    canManageSettings: false,
    canDeleteBase: false,
    canConnectIntegrations: false,
    canDisconnectIntegrations: false,
  },
  member: {
    canCreateLeads: true,
    canReadLeads: true,
    canUpdateLeads: true,
    canDeleteLeads: false,
    canAssignLeads: true,
    canExportLeads: true,
    canCreateCampaigns: true,
    canReadCampaigns: true,
    canUpdateCampaigns: true,
    canDeleteCampaigns: false,
    canExecuteCampaigns: true,
    canManageMembers: false,
    canEditSchema: false,
    canManageViews: true,
    canManageSettings: false,
    canDeleteBase: false,
    canConnectIntegrations: false,
    canDisconnectIntegrations: false,
  },
  viewer: {
    canCreateLeads: false,
    canReadLeads: true,
    canUpdateLeads: false,
    canDeleteLeads: false,
    canAssignLeads: false,
    canExportLeads: true,
    canCreateCampaigns: false,
    canReadCampaigns: true,
    canUpdateCampaigns: false,
    canDeleteCampaigns: false,
    canExecuteCampaigns: false,
    canManageMembers: false,
    canEditSchema: false,
    canManageViews: false,
    canManageSettings: false,
    canDeleteBase: false,
    canConnectIntegrations: false,
    canDisconnectIntegrations: false,
  },
};

/**
 * Get permissions for a role with optional custom overrides
 */
export function getPermissionsForRole(
  role: BaseMemberRole,
  customPermissions?: Partial<BasePermissions>
): BasePermissions {
  const basePermissions = rolePermissions[role];
  return { ...basePermissions, ...customPermissions };
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: BaseMemberRole,
  permission: keyof BasePermissions,
  customPermissions?: Partial<BasePermissions>
): boolean {
  const permissions = getPermissionsForRole(role, customPermissions);
  return permissions[permission];
}

/**
 * Map permission action to BasePermissions key
 */
export function actionToPermissionKey(action: PermissionAction): keyof BasePermissions | null {
  const mapping: Record<PermissionAction, keyof BasePermissions | null> = {
    "leads:create": "canCreateLeads",
    "leads:read": "canReadLeads",
    "leads:update": "canUpdateLeads",
    "leads:delete": "canDeleteLeads",
    "leads:assign": "canAssignLeads",
    "leads:export": "canExportLeads",
    "campaigns:create": "canCreateCampaigns",
    "campaigns:read": "canReadCampaigns",
    "campaigns:update": "canUpdateCampaigns",
    "campaigns:delete": "canDeleteCampaigns",
    "campaigns:execute": "canExecuteCampaigns",
    "base:manageMembers": "canManageMembers",
    "base:editSchema": "canEditSchema",
    "base:manageViews": "canManageViews",
    "base:manageSettings": "canManageSettings",
    "base:delete": "canDeleteBase",
    "integrations:connect": "canConnectIntegrations",
    "integrations:disconnect": "canDisconnectIntegrations",
    "platform:admin": null, // Platform admin is handled separately
  };
  return mapping[action];
}

/**
 * Permission guard for UI components
 * Returns true if user has permission, false otherwise
 */
export function canPerformAction(
  role: BaseMemberRole | undefined,
  action: PermissionAction,
  isPlatformAdmin: boolean = false,
  customPermissions?: Partial<BasePermissions>
): boolean {
  // Platform admins have all permissions
  if (isPlatformAdmin) {
    return true;
  }

  // No role means no permissions
  if (!role) {
    return false;
  }

  // Map action to permission key
  const permissionKey = actionToPermissionKey(action);
  if (!permissionKey) {
    return false;
  }

  return hasPermission(role, permissionKey, customPermissions);
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: BaseMemberRole): string {
  const names: Record<BaseMemberRole, string> = {
    owner: "Owner",
    admin: "Admin",
    editor: "Editor",
    member: "Member",
    viewer: "Viewer",
  };
  return names[role];
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: BaseMemberRole): string {
  const colors: Record<BaseMemberRole, string> = {
    owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    editor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    viewer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };
  return colors[role];
}

/**
 * Get permission description for UI
 */
export function getPermissionDescription(permission: keyof BasePermissions): string {
  const descriptions: Record<keyof BasePermissions, string> = {
    canCreateLeads: "Create new leads",
    canReadLeads: "View leads",
    canUpdateLeads: "Edit lead information",
    canDeleteLeads: "Delete leads",
    canAssignLeads: "Assign leads to team members",
    canExportLeads: "Export leads to CSV",
    canCreateCampaigns: "Create new campaigns",
    canReadCampaigns: "View campaigns",
    canUpdateCampaigns: "Edit campaign settings",
    canDeleteCampaigns: "Delete campaigns",
    canExecuteCampaigns: "Start and stop campaigns",
    canManageMembers: "Invite and remove team members",
    canEditSchema: "Create and modify columns",
    canManageViews: "Create and edit views",
    canManageSettings: "Change workspace settings",
    canDeleteBase: "Delete workspace",
    canConnectIntegrations: "Connect integrations",
    canDisconnectIntegrations: "Disconnect integrations",
  };
  return descriptions[permission];
}
