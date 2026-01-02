import { useState, useEffect, useMemo } from "react";
import { apiRequest, getUser } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";

export type BaseMemberRole = "owner" | "admin" | "editor" | "viewer" | "member";

export interface BaseMembership {
  id: number;
  base_id: number;
  user_id: number;
  role: BaseMemberRole;
  permissions?: any;
}

interface BasePermissions {
  // Leads permissions
  canCreateLeads: boolean;
  canReadLeads: boolean;
  canUpdateLeads: boolean;
  canDeleteLeads: boolean;
  canAssignLeads: boolean;
  canExportLeads: boolean;
  
  // Campaigns permissions
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
  
  // Integrations permissions
  canConnectIntegrations: boolean;
  canDisconnectIntegrations: boolean;
  
  // Role info
  role: BaseMemberRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  membership: BaseMembership | null;
}

const defaultPermissions: BasePermissions = {
  canCreateLeads: false,
  canReadLeads: false,
  canUpdateLeads: false,
  canDeleteLeads: false,
  canAssignLeads: false,
  canExportLeads: false,
  canCreateCampaigns: false,
  canReadCampaigns: false,
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
  role: null,
  isOwner: false,
  isAdmin: false,
  isEditor: false,
  isViewer: false,
  membership: null,
};

// Role-based default permissions
const rolePermissions: Record<BaseMemberRole, Partial<BasePermissions>> = {
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
    canDeleteBase: false,
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
  member: {
    canCreateLeads: true,
    canReadLeads: true,
    canUpdateLeads: true,
    canDeleteLeads: false,
    canAssignLeads: false,
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
};

export function useBasePermissions(baseId: number | null) {
  const { activeBaseId } = useBaseStore();
  const [membership, setMembership] = useState<BaseMembership | null>(null);
  const [loading, setLoading] = useState(true);
  
  const targetBaseId = baseId || activeBaseId;
  const currentUser = getUser();

  useEffect(() => {
    const fetchMembership = async () => {
      if (!targetBaseId || !currentUser?.id) {
        setMembership(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch base members to find current user's membership
        const data = await apiRequest(`/bases/${targetBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        
        // Find current user's membership
        const userMembership = members.find((m: any) => {
          const userId = m.user?.id || m.User?.id;
          return userId === currentUser.id;
        });

        if (userMembership) {
          setMembership({
            id: userMembership.id,
            base_id: userMembership.base_id,
            user_id: userMembership.user_id || userMembership.User?.id,
            role: userMembership.role as BaseMemberRole,
            permissions: userMembership.permissions,
          });
        } else {
          // Check if user is the base owner
          const baseData = await apiRequest(`/bases/${targetBaseId}`);
          if (baseData?.base?.user_id === currentUser.id) {
            setMembership({
              id: 0,
              base_id: targetBaseId,
              user_id: currentUser.id,
              role: "owner",
              permissions: null,
            });
          } else {
            setMembership(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch membership:", error);
        setMembership(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMembership();
  }, [targetBaseId, currentUser?.id]);

  const permissions = useMemo((): BasePermissions => {
    if (!membership && !currentUser) {
      return defaultPermissions;
    }

    // Admin users have full access
    if (currentUser?.role === "admin") {
      return {
        ...defaultPermissions,
        ...rolePermissions.owner,
        role: "owner" as BaseMemberRole,
        isOwner: true,
        isAdmin: true,
        membership: membership || {
          id: 0,
          base_id: targetBaseId || 0,
          user_id: currentUser.id,
          role: "owner",
        },
      };
    }

    if (!membership) {
      return defaultPermissions;
    }

    const role = membership.role;
    const basePerms = rolePermissions[role] || {};
    
    // Merge custom permissions if they exist
    const customPerms = membership.permissions || {};
    const finalPerms: BasePermissions = {
      ...defaultPermissions,
      ...basePerms,
      // Override with custom permissions if specified
      ...(customPerms.leads && {
        canCreateLeads: customPerms.leads.create ?? basePerms.canCreateLeads ?? false,
        canReadLeads: customPerms.leads.read ?? basePerms.canReadLeads ?? false,
        canUpdateLeads: customPerms.leads.update ?? basePerms.canUpdateLeads ?? false,
        canDeleteLeads: customPerms.leads.delete ?? basePerms.canDeleteLeads ?? false,
        canAssignLeads: customPerms.leads.assign ?? basePerms.canAssignLeads ?? false,
        canExportLeads: customPerms.leads.export ?? basePerms.canExportLeads ?? false,
      }),
      ...(customPerms.campaigns && {
        canCreateCampaigns: customPerms.campaigns.create ?? basePerms.canCreateCampaigns ?? false,
        canReadCampaigns: customPerms.campaigns.read ?? basePerms.canReadCampaigns ?? false,
        canUpdateCampaigns: customPerms.campaigns.update ?? basePerms.canUpdateCampaigns ?? false,
        canDeleteCampaigns: customPerms.campaigns.delete ?? basePerms.canDeleteCampaigns ?? false,
        canExecuteCampaigns: customPerms.campaigns.execute ?? basePerms.canExecuteCampaigns ?? false,
      }),
      ...(customPerms.base && {
        canManageMembers: customPerms.base.manageMembers ?? basePerms.canManageMembers ?? false,
        canEditSchema: customPerms.base.editSchema ?? basePerms.canEditSchema ?? false,
        canManageViews: customPerms.base.manageViews ?? basePerms.canManageViews ?? false,
        canManageSettings: customPerms.base.manageSettings ?? basePerms.canManageSettings ?? false,
      }),
      ...(customPerms.integrations && {
        canConnectIntegrations: customPerms.integrations.connect ?? basePerms.canConnectIntegrations ?? false,
        canDisconnectIntegrations: customPerms.integrations.disconnect ?? basePerms.canDisconnectIntegrations ?? false,
      }),
      role,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isEditor: role === "editor",
      isViewer: role === "viewer",
      membership,
    };

    return finalPerms;
  }, [membership, currentUser, targetBaseId]);

  return { permissions, loading, membership };
}

