"use client";

import { ReactNode } from "react";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { PermissionAction } from "@/lib/permissions";

interface PermissionGuardProps {
  children: ReactNode;
  action: PermissionAction;
  baseId?: number;
  fallback?: ReactNode;
  showFallback?: boolean;
}

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGuard action="leads:delete" baseId={baseId}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  action,
  baseId,
  fallback = null,
  showFallback = false,
}: PermissionGuardProps) {
  const { permissions } = useBasePermissions(baseId ?? null);

  // Map action to permission check
  const hasPermission = (() => {
    switch (action) {
      case "leads:create":
        return permissions.canCreateLeads;
      case "leads:read":
        return permissions.canReadLeads;
      case "leads:update":
        return permissions.canUpdateLeads;
      case "leads:delete":
        return permissions.canDeleteLeads;
      case "leads:assign":
        return permissions.canAssignLeads;
      case "leads:export":
        return permissions.canExportLeads;
      case "campaigns:create":
        return permissions.canCreateCampaigns;
      case "campaigns:read":
        return permissions.canReadCampaigns;
      case "campaigns:update":
        return permissions.canUpdateCampaigns;
      case "campaigns:delete":
        return permissions.canDeleteCampaigns;
      case "campaigns:execute":
        return permissions.canExecuteCampaigns;
      case "base:manageMembers":
        return permissions.canManageMembers;
      case "base:editSchema":
        return permissions.canEditSchema;
      case "base:manageViews":
        return permissions.canManageViews;
      case "base:manageSettings":
        return permissions.canManageSettings;
      case "base:delete":
        return permissions.canDeleteBase;
      case "integrations:connect":
        return permissions.canConnectIntegrations;
      case "integrations:disconnect":
        return permissions.canDisconnectIntegrations;
      case "platform:admin":
        // Platform admin is handled at user level, not base level
        return false;
      default:
        return false;
    }
  })();

  if (!hasPermission) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Hook version of PermissionGuard for conditional logic
 */
export function usePermissionCheck(action: PermissionAction, baseId?: number): boolean {
  const { permissions } = useBasePermissions(baseId ?? null);

  switch (action) {
    case "leads:create":
      return permissions.canCreateLeads;
    case "leads:read":
      return permissions.canReadLeads;
    case "leads:update":
      return permissions.canUpdateLeads;
    case "leads:delete":
      return permissions.canDeleteLeads;
    case "leads:assign":
      return permissions.canAssignLeads;
    case "leads:export":
      return permissions.canExportLeads;
    case "campaigns:create":
      return permissions.canCreateCampaigns;
    case "campaigns:read":
      return permissions.canReadCampaigns;
    case "campaigns:update":
      return permissions.canUpdateCampaigns;
    case "campaigns:delete":
      return permissions.canDeleteCampaigns;
    case "campaigns:execute":
      return permissions.canExecuteCampaigns;
    case "base:manageMembers":
      return permissions.canManageMembers;
    case "base:editSchema":
      return permissions.canEditSchema;
    case "base:manageViews":
      return permissions.canManageViews;
    case "base:manageSettings":
      return permissions.canManageSettings;
    case "base:delete":
      return permissions.canDeleteBase;
    case "integrations:connect":
      return permissions.canConnectIntegrations;
    case "integrations:disconnect":
      return permissions.canDisconnectIntegrations;
    case "platform:admin":
      // Platform admin is handled at user level, not base level
      return false;
    default:
      return false;
  }
}
