"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getUser, User as ApiUser } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { BaseMemberRole } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";
import BaseCard from "@/components/ui/BaseCard";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";

type MembershipRole = BaseMemberRole;

interface MemberRow {
  membershipId: number;
  userId: number;
  role: MembershipRole;
  user: ApiUser;
  joinedAt?: string;
}

interface PendingInviteRow {
  id: number;
  email: string;
  role: string;
  expires_at?: string;
  createdAt?: string;
}

const membershipRoleOptions: Array<{ value: MembershipRole; label: string; description: string }> = [
  { value: "owner", label: "Owner (transfer)", description: "Full control. Only used when transferring ownership." },
  { value: "admin", label: "Admin", description: "Manage members, schema, settings, and all day-to-day operations" },
  { value: "editor", label: "Editor", description: "Create/update leads & campaigns, run campaigns, manage views" },
  { value: "viewer", label: "Viewer", description: "Read-only access (can export), no edits" },
  { value: "member", label: "Member", description: "Collaborates on leads and campaigns (limited admin permissions)" }
];

const INVITE_RESEND_ROLES = new Set(["admin", "editor", "member", "viewer"]);

export default function TeamPage() {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useNotification();
  const confirm = useConfirm();
  const { bases, activeBaseId, setActiveBaseId, refreshBases } = useBase();
  const storeBases = useBaseStore((s) => s.bases);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [ownerCount, setOwnerCount] = useState(0);
  const [viewerMembershipRole, setViewerMembershipRole] = useState<MembershipRole | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([]);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(false);
  const [cancelInviteId, setCancelInviteId] = useState<number | null>(null);
  const [resendInviteId, setResendInviteId] = useState<number | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    emailOrId: "",
    name: "",
    role: "member" as MembershipRole
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  /** Workspace-owner-only: lead credits spent per teammate (from ledger). */
  const [creditSpendByUser, setCreditSpendByUser] = useState<Record<number, number>>({});
  const [creditSpendUnattributed, setCreditSpendUnattributed] = useState(0);

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

  const activeBase = useMemo(
    () => storeBases.find((b) => b.id === activeBaseId) ?? null,
    [storeBases, activeBaseId]
  );
  const isWorkspaceOwner = useMemo(
    () => Boolean(currentUser?.id && activeBase?.user_id === currentUser.id),
    [currentUser?.id, activeBase?.user_id]
  );
  const canManageTeam = useMemo(
    () =>
      viewerIsAdmin ||
      isWorkspaceOwner ||
      viewerMembershipRole === "owner" ||
      viewerMembershipRole === "admin",
    [viewerIsAdmin, isWorkspaceOwner, viewerMembershipRole]
  );

  const refreshMembers = useCallback(async () => {
    if (!activeBaseId) {
      setMembers([]);
      setOwnerCount(0);
      setViewerMembershipRole(null);
      setCreditSpendByUser({});
      setCreditSpendUnattributed(0);
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

      const baseFromStore = useBaseStore.getState().bases.find((b) => b.id === activeBaseId);
      const viewerIsWorkspaceOwner = Boolean(
        currentUser?.id && baseFromStore?.user_id === currentUser.id
      );
      if (viewerIsWorkspaceOwner) {
        try {
          const spendRes = await apiRequest(`/bases/${activeBaseId}/members/credit-spend`);
          const raw = (spendRes?.spend_by_user || {}) as Record<string, number>;
          const next: Record<number, number> = {};
          for (const [k, v] of Object.entries(raw)) {
            const uid = Number(k);
            if (Number.isFinite(uid) && uid > 0) next[uid] = Number(v) || 0;
          }
          setCreditSpendByUser(next);
          setCreditSpendUnattributed(Number(spendRes?.unattributed) || 0);
        } catch {
          setCreditSpendByUser({});
          setCreditSpendUnattributed(0);
        }
      } else {
        setCreditSpendByUser({});
        setCreditSpendUnattributed(0);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load team members for this base.";
      setMembers([]);
      setOwnerCount(0);
      setViewerMembershipRole(null);
      setCreditSpendByUser({});
      setCreditSpendUnattributed(0);
      setMembersError(message);
    } finally {
      setMembersLoading(false);
    }
  }, [activeBaseId, currentUser?.id, viewerIsAdmin]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    setMemberSearch("");
  }, [activeBaseId]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!activeBaseId) {
      setPendingInvites([]);
      return;
    }
    setPendingInvitesLoading(true);
    try {
      const data = await apiRequest(`/invitations?base_id=${activeBaseId}`);
      const list: PendingInviteRow[] = Array.isArray(data?.invitations) ? data.invitations : [];
      setPendingInvites(list);
    } catch {
      setPendingInvites([]);
    } finally {
      setPendingInvitesLoading(false);
    }
  }, [activeBaseId]);

  useEffect(() => {
    if (!canManageTeam || !activeBaseId) {
      setPendingInvites([]);
      setPendingInvitesLoading(false);
      return;
    }
    fetchPendingInvitations();
  }, [canManageTeam, activeBaseId, fetchPendingInvitations]);

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
    if (canManageTeam && canViewDirectory) {
      fetchDirectory();
    } else {
      setAvailableUsers([]);
    }
  }, [canManageTeam, canViewDirectory, fetchDirectory]);

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
        await fetchPendingInvitations();
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

  const resendPendingInvitation = async (row: PendingInviteRow) => {
    if (!activeBaseId) {
      showWarning("Select a workspace", "Choose a workspace first.");
      return;
    }
    const roleLower = String(row.role || "member").toLowerCase();
    if (!INVITE_RESEND_ROLES.has(roleLower)) {
      showError("Cannot resend", "This invitation has an unsupported role.");
      return;
    }
    setResendInviteId(row.id);
    try {
      const data = await apiRequest("/invitations", {
        method: "POST",
        body: JSON.stringify({
          base_id: activeBaseId,
          email: row.email.trim().toLowerCase(),
          role: roleLower,
        }),
      });
      showSuccess(
        data?.resent ? "Invitation resent" : "Invitation sent",
        typeof data?.message === "string" ? data.message : `Email sent to ${row.email}.`
      );
      await fetchPendingInvitations();
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to resend invitation";
      showError("Resend failed", message);
    } finally {
      setResendInviteId(null);
    }
  };

  const cancelPendingInvitation = async (row: PendingInviteRow) => {
    const ok = await confirm({
      title: "Cancel invitation?",
      message: `Remove the pending invite for ${row.email}?`,
      confirmLabel: "Cancel invite",
      variant: "danger",
    });
    if (!ok) return;
    setCancelInviteId(row.id);
    try {
      await apiRequest(`/invitations/${row.id}`, { method: "DELETE" });
      showSuccess("Invitation cancelled", "They will no longer be able to use that invite link.");
      await fetchPendingInvitations();
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to cancel invitation";
      showError("Cancel failed", message);
    } finally {
      setCancelInviteId(null);
    }
  };

  const handleBaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const n = value ? Number(value) : null;
    const hit = n != null ? bases.find((b) => b.id === n) : undefined;
    setActiveBaseId(n, hit ? { name: hit.name } : undefined);
  };

  const totalMembers = members.length;
  const totalOwners = ownerCount;
  const totalMembersWithoutOwners = Math.max(totalMembers - ownerCount, 0);

  const viewerRoleLabel = useMemo(() => {
    if (viewerIsAdmin) return "Platform Admin";
    if (viewerMembershipRole) return `Base ${viewerMembershipRole.charAt(0).toUpperCase() + viewerMembershipRole.slice(1)}`;
    return "Viewer";
  }, [viewerIsAdmin, viewerMembershipRole]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.user.name || "").toLowerCase();
      const email = (m.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || String(m.userId).includes(q);
    });
  }, [members, memberSearch]);

  if (!activeBaseId) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          width: "100%",
          background: "var(--color-canvas)",
          display: "flex",
          flexDirection: "column",
          padding: "8px clamp(10px, 1.25vw, 20px) 14px",
          gap: 16,
          boxSizing: "border-box",
        }}
      >
        <EmptyStateBanner
          icon={<Icons.Users size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No Active Workspace"
          description="Choose a workspace to view members, roles, and invitations."
          actions={
            <button
              type="button"
              className="btn-primary focus-ring"
              style={{ borderRadius: 8 }}
              onClick={() => router.push("/bases")}
            >
              Open workspaces
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        width: "100%",
        background: "var(--color-canvas)",
        display: "flex",
        flexDirection: "column",
        padding: "8px clamp(10px, 1.25vw, 20px) 14px",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 4,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260, flexWrap: "wrap" }}>
          <ToolbarSearchField
            variant="minimal"
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Search members by name or email"
            style={{ minWidth: 260, maxWidth: 640, flex: 1 }}
            aria-label="Search team members"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
          <label htmlFor="team-base-selector" className="text-hint" style={{ fontSize: 11, fontWeight: 600 }}>
            Workspace
          </label>
          <select
            id="team-base-selector"
            value={activeBaseId ?? ""}
            onChange={handleBaseChange}
            className="focus-ring"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--elev-border)",
              background: "var(--elev-bg)",
              color: "var(--color-text)",
              minWidth: 200,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {bases.length === 0 && <option value="">No workspaces</option>}
            {bases.map((base) => (
              <option key={base.id} value={base.id}>
                {base.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary focus-ring"
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={() => setShowInviteModal(true)}
            disabled={!canManageTeam}
          >
            <Icons.UserPlus size={16} strokeWidth={1.5} />
            Invite
          </button>
          <button
            type="button"
            className="btn-dashboard-outline focus-ring"
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={() => {
              void refreshMembers();
              if (canManageTeam) void fetchPendingInvitations();
            }}
          >
            <Icons.RefreshCw size={16} strokeWidth={1.5} />
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          color: "var(--color-text-muted)",
          fontSize: 13,
          alignItems: "center",
        }}
      >
        <span>Your access: {viewerRoleLabel}</span>
        {viewerMembershipRole && !viewerIsAdmin && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <RoleBadge role={viewerMembershipRole} size="sm" />
          </span>
        )}
        {!canManageTeam && (
          <span>View-only roster — workspace owners and admins can invite or change roles.</span>
        )}
      </div>

      {membersError && (
        <div
          role="alert"
          style={{
            background: "rgba(248, 113, 113, 0.08)",
            border: "1px solid var(--elev-border)",
            color: "var(--color-text)",
            padding: "14px 16px",
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <strong style={{ color: "#f87171" }}>Could not load team.</strong> {membersError}
        </div>
      )}

      {membersLoading ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
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
              gap: 12,
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

          {canManageTeam && (
            <BaseCard style={{ padding: "20px 24px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Mail size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
                  Pending invitations
                </h3>
              </div>
              {pendingInvitesLoading ? (
                <p className="text-hint" style={{ margin: 0, fontSize: 13 }}>
                  Loading invitations…
                </p>
              ) : pendingInvites.length === 0 ? (
                <p className="text-hint" style={{ margin: 0, fontSize: 13 }}>
                  No pending invites. Send one with Invite — recipients appear here until they accept.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--elev-border)" }}>
                        <HeaderCell>Email</HeaderCell>
                        <HeaderCell>Role</HeaderCell>
                        <HeaderCell>Expires</HeaderCell>
                        <HeaderCell>Actions</HeaderCell>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((inv) => (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom: "1px solid var(--elev-border)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-surface-secondary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "12px 10px", fontSize: 14, color: "var(--color-text)" }}>{inv.email}</td>
                          <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--color-text)" }}>
                            <span style={{ textTransform: "capitalize" }}>{inv.role}</span>
                          </td>
                          <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--color-text-muted)" }}>
                            {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn-dashboard-outline focus-ring"
                                style={{ borderRadius: 8, fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                                disabled={resendInviteId === inv.id || cancelInviteId === inv.id}
                                onClick={() => void resendPendingInvitation(inv)}
                              >
                                <Icons.Send size={14} strokeWidth={1.5} />
                                {resendInviteId === inv.id ? "Sending…" : "Resend"}
                              </button>
                              <button
                                type="button"
                                className="btn-dashboard-outline focus-ring"
                                style={{ borderRadius: 8, fontSize: 12, padding: "6px 12px" }}
                                disabled={cancelInviteId === inv.id || resendInviteId === inv.id}
                                onClick={() => void cancelPendingInvitation(inv)}
                              >
                                {cancelInviteId === inv.id ? "Cancelling…" : "Cancel"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </BaseCard>
          )}

          <BaseCard style={{ padding: "24px", overflow: "hidden" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px 0", color: "var(--color-text)" }}>
              Team members (
              {memberSearch.trim() ? `${filteredMembers.length} shown · ${totalMembers} total` : totalMembers})
            </h3>
            {isWorkspaceOwner && (
              <p className="text-hint" style={{ margin: "-8px 0 16px", fontSize: 13, lineHeight: 1.5, color: "var(--color-text-muted)" }}>
                Teammates use lead credits from your pool. The &quot;Credits spent&quot; column (visible only to you) sums
                workspace ledger entries by who performed the action. Integrations run with your Admin → API credentials
                when a member has not saved their own keys.
              </p>
            )}

            {members.length === 0 ? (
              <EmptyStateBanner
                icon={<Icons.Users size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
                title="No members yet"
                description="Invite teammates to collaborate on campaigns and leads in this workspace."
                actions={
                  canManageTeam ? (
                    <button
                      type="button"
                      className="btn-primary focus-ring"
                      style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
                      onClick={() => setShowInviteModal(true)}
                    >
                      <Icons.UserPlus size={16} strokeWidth={1.5} />
                      Invite member
                    </button>
                  ) : undefined
                }
              />
            ) : filteredMembers.length === 0 ? (
              <EmptyStateBanner
                icon={<Icons.Users size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
                title="No matches"
                description="Try a different name, email, or user ID in the search field above."
                actions={
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    style={{ borderRadius: 8 }}
                    onClick={() => setMemberSearch("")}
                  >
                    Clear search
                  </button>
                }
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--elev-border)" }}>
                      <HeaderCell>Member</HeaderCell>
                      <HeaderCell>Workspace role</HeaderCell>
                      <HeaderCell>Platform role</HeaderCell>
                      <HeaderCell>Joined</HeaderCell>
                      {isWorkspaceOwner && (
                        <HeaderCell>
                          <span title="Lead credits debited from your workspace pool and attributed to this user when recorded.">
                            Credits spent
                          </span>
                        </HeaderCell>
                      )}
                      <HeaderCell>Actions</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
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
                            borderBottom: "1px solid var(--elev-border)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-surface-secondary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "16px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "50%",
                                  background: "var(--elev-bg)",
                                  border: "1px solid var(--elev-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--color-text-muted)",
                                }}
                              >
                                <Icons.User size={20} strokeWidth={1.5} />
                              </div>
                              <div>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
                                  {member.user.name}
                                  {isSelf && (
                                    <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--color-text-muted)" }}>
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{member.user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "16px 12px" }}>
                            {canManageTeam ? (
                              <select
                                className="focus-ring"
                                value={member.role}
                                disabled={roleChangeDisabled}
                                onChange={(event) =>
                                  updateMemberRole(member, event.target.value as MembershipRole)
                                }
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  border: "1px solid var(--elev-border)",
                                  background: "var(--elev-bg)",
                                  color: "var(--color-text)",
                                  cursor: roleChangeDisabled ? "not-allowed" : "pointer",
                                  fontSize: 13,
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
                          <td style={{ padding: "16px 12px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                            {member.user.role === "admin" ? "Admin" : "User"}
                          </td>
                          <td style={{ padding: "16px 12px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}
                          </td>
                          {isWorkspaceOwner && (
                            <td style={{ padding: "16px 12px", fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
                              {(() => {
                                const attributed = creditSpendByUser[member.userId] ?? 0;
                                const isBillingOwnerRow =
                                  Boolean(activeBase?.user_id) && member.userId === activeBase?.user_id;
                                const total =
                                  attributed + (isBillingOwnerRow && creditSpendUnattributed > 0 ? creditSpendUnattributed : 0);
                                if (total === 0) return <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>0</span>;
                                return (
                                  <span title={isBillingOwnerRow && creditSpendUnattributed > 0 ? `Includes ${creditSpendUnattributed} credit(s) not attributed to a specific teammate.` : undefined}>
                                    {total.toLocaleString()}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
                          <td style={{ padding: "16px 12px" }}>
                            <button
                              type="button"
                              className="btn-dashboard-outline focus-ring"
                              style={{
                                borderRadius: 8,
                                fontSize: 12,
                                padding: "8px 12px",
                                borderColor: "rgba(248, 113, 113, 0.35)",
                                color: "#f87171",
                                opacity: !canManageTeam || removeDisabled ? 0.5 : 1,
                              }}
                              onClick={() => void removeMember(member)}
                              disabled={!canManageTeam || removeDisabled}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <Icons.Trash size={14} strokeWidth={1.5} />
                                Remove
                              </span>
                            </button>
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
    <BaseCard className="bases-workspace-card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <div style={{ color: accent, display: "flex", alignItems: "center" }}>{icon}</div>
        <h3
          className="bases-workspace-card-metric-label"
          style={{ margin: 0, letterSpacing: "0.06em", color: "var(--color-text-muted)" }}
        >
          {label}
        </h3>
      </div>
      <div className="bases-workspace-card-metric-value" style={{ fontSize: "1.75rem", marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.45 }}>{description}</div>
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
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: "8px 0 0 0", lineHeight: 1.5 }}>
              Send an <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>email invitation</strong> for
              anyone to join after they sign in, or enter a numeric <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>user ID</strong>{" "}
              to add an existing account directly. Owner role cannot be assigned via invite.
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
          <small style={{ color: "var(--color-text-muted)", lineHeight: 1.45 }}>
            Email addresses always receive an invite link. User IDs must belong to an existing account in the system.
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
              background: "var(--elev-bg)",
              border: "1px solid var(--elev-border)",
              padding: "10px 14px",
              borderRadius: 10,
              color: "var(--color-text)",
              fontSize: 13,
            }}
          >
            Loading user directory…
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            className="btn-primary focus-ring"
            style={{ borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, flex: 1 }}
            onClick={() => void onInvite()}
            disabled={disabled}
          >
            {inviteLoading ? "Sending…" : "Send invite"}
          </button>
          <button
            type="button"
            className="btn-dashboard-outline focus-ring"
            style={{ borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, flex: 1 }}
            onClick={onClose}
            disabled={inviteLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
