"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiRequest, getUser, User as ApiUser } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { BaseMemberRole } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";
import BaseCard from "@/components/ui/BaseCard";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

type MembershipRole = BaseMemberRole;

interface MemberRow {
  membershipId: number;
  userId: number;
  role: MembershipRole;
  user: ApiUser;
  joinedAt?: string;
}

const membershipRoleOptions: Array<{ value: MembershipRole; label: string; description: string }> = [
  { value: "owner", label: "Owner (transfer)", description: "Full control. Only used when transferring ownership." },
  { value: "admin", label: "Admin", description: "Manage members, schema, settings, and all day-to-day operations" },
  { value: "editor", label: "Editor", description: "Create/update leads & campaigns, run campaigns, manage views" },
  { value: "viewer", label: "Viewer", description: "Read-only access (can export), no edits" },
  { value: "member", label: "Member", description: "Collaborates on leads and campaigns (limited admin permissions)" }
];

const roleBadgeColor: Partial<Record<MembershipRole, string>> = {
  owner: "#ff6b6b",
  member: "#7C3AED",
  admin: "#7C3AED",
  editor: "#4ecdc4",
  viewer: "#888"
};

const defaultStats = {
  status: "active",
  lastActive: "—",
  campaigns: 0,
  leads: 0
};

const generateTemporaryPassword = () => `Join${Math.random().toString(36).slice(-6)}!`;

export default function TeamPage() {
  const { showError, showSuccess, showWarning } = useNotification();
  const confirm = useConfirm();
  const { bases, activeBaseId, setActiveBaseId, refreshBases } = useBase();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [ownerCount, setOwnerCount] = useState(0);
  const [viewerMembershipRole, setViewerMembershipRole] = useState<MembershipRole | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    emailOrId: "",
    name: "",
    role: "member" as MembershipRole
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<ApiUser[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const [currentUser] = useState<ApiUser | null>(() => getUser());
  const viewerIsAdmin = currentUser?.role === "admin";
  const canViewDirectory = viewerIsAdmin;

  // Ensure bases list is up to date
  useEffect(() => {
    if (!bases.length) {
      refreshBases();
    }
  }, [bases.length, refreshBases]);

  const refreshMembers = useCallback(async () => {
    if (!activeBaseId) {
      setMembers([]);
      setOwnerCount(0);
      setViewerMembershipRole(null);
      setCanManage(false);
      setMembersError(null);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    try {
      const data = await apiRequest(`/bases/${activeBaseId}/members`);
      const rawMembers: any[] = Array.isArray(data?.members) ? data.members : [];

      const parsedMembers: MemberRow[] = rawMembers.reduce<MemberRow[]>((acc, member) => {
        const associatedUser = member?.User || member?.user;
        if (!associatedUser || typeof associatedUser.id !== "number") {
          return acc;
        }

        const resolvedUser: ApiUser = {
          id: associatedUser.id,
          email: associatedUser.email,
          name: associatedUser.name || associatedUser.email,
          company: associatedUser.company,
          role: associatedUser.role
        };

        acc.push({
          membershipId: member.id,
          userId: resolvedUser.id,
          role: member.role as MembershipRole,
          user: resolvedUser,
          joinedAt: member.createdAt
        });
        return acc;
      }, []);

      setMembers(parsedMembers);
      const owners = parsedMembers.filter((member) => member.role === "owner").length;
      setOwnerCount(owners);

      const viewerMembership = parsedMembers.find((member) => member.userId === currentUser?.id) || null;
      setViewerMembershipRole(viewerMembership?.role ?? null);
      setCanManage(viewerIsAdmin || viewerMembership?.role === "owner" || viewerMembership?.role === "admin");
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load team members for this base.";
      setMembers([]);
      setOwnerCount(0);
      setViewerMembershipRole(null);
      setCanManage(false);
      setMembersError(message);
    } finally {
      setMembersLoading(false);
    }
  }, [activeBaseId, currentUser?.id, viewerIsAdmin]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const fetchDirectory = useCallback(async () => {
    if (!canViewDirectory) {
      setAvailableUsers([]);
      return;
    }

    setDirectoryLoading(true);
    try {
      const data = await apiRequest("/admin/users");
      const list: ApiUser[] = Array.isArray(data) ? data : data?.users || [];
      setAvailableUsers(list);
    } catch (error) {
      console.warn("Failed to load user directory", error);
      setAvailableUsers([]);
    } finally {
      setDirectoryLoading(false);
    }
  }, [canViewDirectory]);

  useEffect(() => {
    if (canManage && canViewDirectory) {
      fetchDirectory();
    } else {
      setAvailableUsers([]);
    }
  }, [canManage, canViewDirectory, fetchDirectory]);

  const ownersRemainingAfterChange = useCallback(
    (membership: MemberRow, nextRole: MembershipRole) => {
      if (membership.role === "owner" && nextRole !== "owner") {
        return ownerCount - 1;
      }
      if (membership.role !== "owner" && nextRole === "owner") {
        return ownerCount + 1;
      }
      return ownerCount;
    },
    [ownerCount]
  );

  const updateMemberRole = async (membership: MemberRow, nextRole: MembershipRole) => {
    if (!activeBaseId) {
      showWarning("Select a workspace", "Choose a workspace before changing roles.");
      return;
    }
    if (membership.role === nextRole) {
      return;
    }

    const ownersAfter = ownersRemainingAfterChange(membership, nextRole);
    if (ownersAfter <= 0) {
      showWarning("Owner required", "Every workspace must keep at least one owner. Promote another member first.");
      return;
    }

    setPendingMemberId(membership.membershipId);
    try {
      await apiRequest(`/bases/${activeBaseId}/members/${membership.membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole })
      });
      await refreshMembers();
      showSuccess("Role updated", `${membership.user.name} is now ${nextRole}.`);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to update role";
      showError("Update failed", message);
    } finally {
      setPendingMemberId(null);
    }
  };

  const removeMember = async (membership: MemberRow) => {
    if (!activeBaseId) {
      showWarning("Select a workspace", "Choose a workspace first.");
      return;
    }
    if (membership.role === "owner" && ownerCount <= 1) {
      showWarning("Cannot remove owner", "Transfer ownership to another member before removing the final owner.");
      return;
    }
    if (membership.userId === currentUser?.id) {
      showWarning("Not allowed", "You cannot remove yourself from the workspace.");
      return;
    }

    const confirmed = await confirm({
      title: "Remove member?",
      message: `Remove ${membership.user.name} from this workspace?`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    setPendingMemberId(membership.membershipId);
    try {
      await apiRequest(`/bases/${activeBaseId}/members/${membership.membershipId}`, {
        method: "DELETE"
      });
      await refreshMembers();
      showSuccess("Member removed", `${membership.user.name} was removed from this workspace.`);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to remove member";
      showError("Remove failed", message);
    } finally {
      setPendingMemberId(null);
    }
  };

  const resolveUserIdFromInput = (input: string): number | null => {
    if (!input.trim()) return null;
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  };

  const handleInvite = async () => {
    if (!activeBaseId) {
      showWarning("Select a workspace", "Choose a workspace before inviting members.");
      return;
    }
    if (!inviteForm.emailOrId.trim()) {
      showWarning("Missing email or ID", "Enter an email address or user ID.");
      return;
    }

    setInviteLoading(true);
    try {
      const lowerEmail = inviteForm.emailOrId.trim().toLowerCase();
      
      // Check if input is a valid email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowerEmail);

      if (isEmail) {
        // ALWAYS use invitation system for email addresses
        // Works for both existing and new users
        await apiRequest("/invitations", {
          method: "POST",
          body: JSON.stringify({
            base_id: activeBaseId,
            email: lowerEmail,
            role: inviteForm.role
          })
        });

        showSuccess(
          "Invitation sent",
          `Email sent to ${lowerEmail}. They can sign in or register and accept to join with role: ${inviteForm.role}. They will appear here after accepting.`
        );
        setShowInviteModal(false);
        setInviteForm({ emailOrId: "", name: "", role: "member" });
        return;
      }

      // Handle numeric user ID input (for direct add)
      const userId = resolveUserIdFromInput(inviteForm.emailOrId);
      
      if (!userId) {
        throw new Error(
          "Please enter a valid email address to send an invitation."
        );
      }

      // Direct add only for numeric user IDs
      await apiRequest(`/bases/${activeBaseId}/members`, {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          role: inviteForm.role
        })
      });

      showSuccess("Member added", "The user was added to this workspace.");
      setShowInviteModal(false);
      setInviteForm({ emailOrId: "", name: "", role: "member" });
      await refreshMembers();
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to invite member";
      showError("Invite failed", message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleBaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setActiveBaseId(value ? Number(value) : null);
  };

  const totalMembers = members.length;
  const totalOwners = ownerCount;
  const totalMembersWithoutOwners = Math.max(totalMembers - ownerCount, 0);

  const viewerRoleLabel = useMemo(() => {
    if (viewerIsAdmin) return "Platform Admin";
    if (viewerMembershipRole) return `Base ${viewerMembershipRole.charAt(0).toUpperCase() + viewerMembershipRole.slice(1)}`;
    return "Viewer";
  }, [viewerIsAdmin, viewerMembershipRole]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <BaseCard
        style={{
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "16px"
            }}
          >
            <div />
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap"
              }}
            >
              <label
                htmlFor="team-base-selector"
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)"
                }}
              >
                Active Base
              </label>
              <select
                id="team-base-selector"
                value={activeBaseId ?? ""}
                onChange={handleBaseChange}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--color-text)",
                  minWidth: "200px"
                }}
              >
                {bases.length === 0 && <option value="">No bases available</option>}
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={!canManage || !activeBaseId}
                style={{
                  background: canManage && activeBaseId
                    ? "linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)"
                    : "rgba(124, 58, 237,0.2)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  color: canManage && activeBaseId ? "#000000" : "#666",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: canManage && activeBaseId ? "pointer" : "not-allowed",
                  boxShadow: canManage && activeBaseId ? "0 4px 12px rgba(124, 58, 237, 0.3)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Icons.Plus size={16} />
                Invite Member
              </button>
              <button
                onClick={() => refreshMembers()}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: "var(--color-text)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Icons.RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              color: "var(--color-text-muted)",
              fontSize: "13px"
            }}
          >
            <span>Viewer access: {viewerRoleLabel}</span>
            {viewerMembershipRole && !viewerIsAdmin && (
              <span> • Your role: <RoleBadge role={viewerMembershipRole} size="sm" /></span>
            )}
            {!canManage && activeBaseId && (
              <span> • You can view the roster but only owners can manage members.</span>
            )}
          </div>
        </div>
      </BaseCard>

      {membersError && (
        <div
          style={{
            background: "rgba(255, 107, 107, 0.15)",
            border: "1px solid rgba(255, 107, 107, 0.3)",
            color: "#ff6b6b",
            padding: "16px",
            borderRadius: "12px"
          }}
        >
          {membersError}
        </div>
      )}

      {membersLoading ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <BaseCard key={i} style={{ padding: "20px 22px" }} aria-hidden>
                <div className="ui-skeleton" style={{ height: 14, width: "42%", borderRadius: 6, marginBottom: 14 }} />
                <div className="ui-skeleton" style={{ height: 28, width: "48%", borderRadius: 8, marginBottom: 10 }} />
                <div className="ui-skeleton" style={{ height: 12, width: "88%", borderRadius: 6 }} />
              </BaseCard>
            ))}
          </div>
          <BaseCard style={{ padding: "24px", overflow: "hidden" }} aria-busy="true" aria-label="Loading team members">
            <div className="ui-skeleton" style={{ height: 22, width: 220, borderRadius: 8, marginBottom: 20 }} />
            <div style={{ overflowX: "auto" }}>
              <TableSkeleton
                columns={4}
                rows={8}
                withCard={false}
                leadingAvatar
                trailingActions
                ariaLabel="Loading team members"
              />
            </div>
          </BaseCard>
        </>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px"
            }}
          >
            <StatCard
              icon={<Icons.Users size={24} />}
              label="Total Members"
              value={totalMembers}
              description="People with access to this base"
              accent="#7C3AED"
            />
            <StatCard
              icon={<Icons.Key size={24} />}
              label="Owners"
              value={totalOwners}
              description="Members who can manage access"
              accent="#ff6b6b"
            />
            <StatCard
              icon={<Icons.Handshake size={24} />}
              label="Collaborators"
              value={totalMembersWithoutOwners}
              description="Members without owner privileges"
              accent="#A94CFF"
            />
            <StatCard
              icon={<Icons.Shield size={24} />}
              label="Your Access"
              value={viewerRoleLabel}
              description="Shows what you can do in this workspace"
              accent="#4ecdc4"
            />
          </div>

          <BaseCard
            style={{
              padding: "24px",
              overflow: "hidden"
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                margin: "0 0 20px 0",
                color: "var(--color-text)"
              }}
            >
              Team Members ({totalMembers})
            </h3>

            {members.length === 0 ? (
              <EmptyStateBanner
                icon={<Icons.Users size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
                title={activeBaseId ? "No members yet" : "Select a workspace"}
                description={
                  activeBaseId
                    ? "Invite teammates to start collaborating on this workspace."
                    : "Choose a workspace to view and manage its team."
                }
                actions={
                  activeBaseId ? (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
                      onClick={() => setShowInviteModal(true)}
                    >
                      <Icons.UserPlus size={16} strokeWidth={1.5} />
                      Invite member
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(124, 58, 237, 0.2)" }}>
                      <HeaderCell>Member</HeaderCell>
                      <HeaderCell>Workspace Role</HeaderCell>
                      <HeaderCell>Platform Role</HeaderCell>
                      <HeaderCell>Joined</HeaderCell>
                      <HeaderCell>Actions</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isSelf = member.userId === currentUser?.id;
                      const isOnlyOwner = member.role === "owner" && ownerCount <= 1;
                      const roleChangeDisabled =
                        pendingMemberId === member.membershipId || (isOnlyOwner && !viewerIsAdmin);
                      const removeDisabled =
                        pendingMemberId === member.membershipId || isSelf || isOnlyOwner;

                      return (
                        <tr
                          key={member.membershipId}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(124, 58, 237, 0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "16px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#000000",
                                fontWeight: 600,
                                fontSize: "16px"
                              }}>
                                <Icons.User size={20} />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--color-text)"
                                  }}
                                >
                                  {member.user.name}
                                  {isSelf && (
                                    <span
                                      style={{
                                        marginLeft: "8px",
                                        fontSize: "11px",
                                        color: "var(--color-text-muted)"
                                      }}
                                    >
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                                  {member.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "16px 12px" }}>
                            {canManage ? (
                              <select
                                value={member.role}
                                disabled={roleChangeDisabled}
                                onChange={(event) =>
                                  updateMemberRole(member, event.target.value as MembershipRole)
                                }
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(124, 58, 237,0.3)",
                                  background: "rgba(124, 58, 237,0.08)",
                                  color: "var(--color-text)",
                                  cursor: roleChangeDisabled ? "not-allowed" : "pointer"
                                }}
                              >
                                {membershipRoleOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <RoleBadge role={member.role} size="sm" />
                            )}
                          </td>
                          <td style={{ padding: "16px 12px", fontSize: "13px" }}>
                            {member.user.role === "admin" ? "Admin" : "User"}
                          </td>
                          <td style={{ padding: "16px 12px", fontSize: "13px" }}>
                            {member.joinedAt
                              ? new Date(member.joinedAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td style={{ padding: "16px 12px" }}>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <button
                                onClick={() => removeMember(member)}
                                disabled={!canManage || removeDisabled}
                                style={{
                                  background: "rgba(255, 107, 107, 0.15)",
                                  border: "1px solid rgba(255, 107, 107, 0.3)",
                                  borderRadius: "8px",
                                  padding: "8px 14px",
                                  color: "#ff6b6b",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  cursor: !canManage || removeDisabled ? "not-allowed" : "pointer",
                                  opacity: !canManage || removeDisabled ? 0.5 : 1,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  if (canManage && !removeDisabled) {
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 107, 107, 0.2)";
                                    e.currentTarget.style.background = "rgba(255, 107, 107, 0.25)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.background = "rgba(255, 107, 107, 0.15)";
                                }}
                              >
                                <Icons.Trash size={14} />
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </BaseCard>
        </>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => {
            if (!inviteLoading) {
              setShowInviteModal(false);
              setInviteForm({ emailOrId: "", name: "", role: "member" });
            }
          }}
          inviteForm={inviteForm}
          setInviteForm={setInviteForm}
          roleOptions={membershipRoleOptions.filter((opt) => opt.value !== "owner")}
          onInvite={handleInvite}
          inviteLoading={inviteLoading}
          canCreateUsers={viewerIsAdmin}
          directoryLoading={directoryLoading}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  accent: string;
}) {
  return (
    <BaseCard
      style={{
        padding: "20px",
        transition: "all 0.2s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 4px 12px ${accent}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <div style={{ color: accent, display: "flex", alignItems: "center" }}>
          {icon}
        </div>
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </h3>
      </div>
      <div style={{ fontSize: "32px", fontWeight: 700, color: accent, marginBottom: "4px" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{description}</div>
    </BaseCard>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "12px",
        textAlign: "left",
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em"
      }}
    >
      {children}
    </th>
  );
}

function InviteModal({
  onClose,
  inviteForm,
  setInviteForm,
  roleOptions,
  onInvite,
  inviteLoading,
  canCreateUsers,
  directoryLoading
}: {
  onClose: () => void;
  inviteForm: { emailOrId: string; name: string; role: MembershipRole };
  setInviteForm: React.Dispatch<
    React.SetStateAction<{ emailOrId: string; name: string; role: MembershipRole }>
  >;
  roleOptions: Array<{ value: MembershipRole; label: string; description: string }>;
  onInvite: () => Promise<void>;
  inviteLoading: boolean;
  canCreateUsers: boolean;
  directoryLoading: boolean;
}) {
  const disabled = inviteLoading || !inviteForm.emailOrId.trim();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "20px",
          padding: "32px",
          border: "1px solid var(--color-border)",
          maxWidth: "520px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                margin: 0,
                color: "var(--color-text)"
              }}
            >
              Invite Team Member
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: "8px 0 0 0" }}>
              Add an existing teammate by email or user ID. Owners can optionally promote them to
              owner during the invite.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: inviteLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "4px",
              transition: "all 0.2s"
            }}
            disabled={inviteLoading}
            onMouseEnter={(e) => {
              if (!inviteLoading) {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "var(--color-text)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
            Email or User ID
          </label>
          <input
            type="text"
            placeholder="e.g. teammate@company.com or 42"
            value={inviteForm.emailOrId}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, emailOrId: event.target.value }))
            }
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text)",
              fontSize: "14px",
              outline: "none"
            }}
          />
          <small style={{ color: "var(--color-text-muted)" }}>
            We’ll look for an existing user by email. If you’re an admin and they don’t exist yet,
            we’ll create an account for them automatically.
          </small>
        </div>

        {canCreateUsers && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
              Full Name (used when creating a new account)
            </label>
            <input
              type="text"
              placeholder="Only required when creating a new account"
              value={inviteForm.name}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))}
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text)",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
            Workspace Role
          </label>
          <select
            value={inviteForm.role}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, role: event.target.value as MembershipRole }))
            }
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text)",
              fontSize: "14px",
              outline: "none"
            }}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </div>

        {directoryLoading && (
          <div
            style={{
              background: "rgba(124, 58, 237,0.12)",
              border: "1px solid rgba(124, 58, 237,0.2)",
              padding: "10px 14px",
              borderRadius: "10px",
              color: "var(--color-text)"
            }}
          >
            Loading user directory…
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onInvite}
            disabled={disabled}
            style={{
              background: disabled
                ? "rgba(124, 58, 237,0.3)"
                : "linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              color: disabled ? "#888" : "#000000",
              fontSize: "14px",
              fontWeight: 600,
              cursor: disabled ? "not-allowed" : "pointer",
              flex: 1
            }}
          >
            {inviteLoading ? "Sending…" : "Invite Member"}
          </button>
          <button
            onClick={onClose}
            disabled={inviteLoading}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "12px 24px",
              color: "var(--color-text)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: inviteLoading ? "not-allowed" : "pointer",
              flex: 1
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
