"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import { adminMatchesSearch } from "@/lib/adminFilters";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  company?: string;
  createdAt: string;
  avatar_url?: string | null;
  billing_plan_key?: string | null;
  billing_expires_at?: string | null;
  billing_grace_ends_at?: string | null;
  team_member_only?: boolean;
  billing_extra_seats?: number;
  credits_balance?: number;
  monthly_lead_credits?: number;
  ai_prompt_tokens_balance?: number;
  monthly_ai_prompt_tokens?: number;
}

interface AdminSeatsSummary {
  team_member_only: boolean;
  billing_plan_key: string | null;
  billing_expires_at: string | null;
  billing_grace_ends_at: string | null;
  plan_tier: string;
  plan_active: boolean;
  included_seats_from_plan: number;
  billing_extra_seats: number;
  effective_total_seats: number;
  previous_included_seats_from_plan?: number;
  previous_effective_total_seats?: number;
  workspaces: Array<{
    base_id: number;
    name: string;
    active_members: number;
    pending_invites: number;
    used_slots: number;
    remaining: number;
  }>;
  aggregate_remaining_min: number;
}

const SUBSCRIPTION_PLAN_OPTIONS = [
  { key: "basic" as const, label: "Basic", credits: 300, aiTokens: 6_000 },
  { key: "pro" as const, label: "Pro", credits: 500, aiTokens: 10_000 },
  { key: "premium" as const, label: "Premium", credits: 1000, aiTokens: 20_000 },
];

type CredKey =
  | "apolloApiKey"
  | "openaiApiKey"
  | "geminiApiKey"
  | "tavilyApiKey"
  | "anymailFinderApiKey"
  | "fullEnrichApiKey"
  | "unipileApiUrl"
  | "unipileApiKey"
  | "elevenlabsApiKey"
  | "elevenlabsAgentId"
  | "elevenlabsPhoneNumberId"
  | "elevenlabsWebhookSecret";

const CRED_FIELDS: { key: CredKey; label: string; hint: string; inputType?: "text" | "password" }[] = [
  { key: "apolloApiKey", label: "Lead search API key", hint: "Lead search / enrichment" },
  { key: "openaiApiKey", label: "OpenAI API key", hint: "AI scoring & generation" },
  { key: "geminiApiKey", label: "Gemini API key", hint: "Optional alternate LLM" },
  { key: "tavilyApiKey", label: "Web research API key", hint: "Company & person research" },
  { key: "anymailFinderApiKey", label: "Anymail finder API key", hint: "Email discovery" },
  { key: "fullEnrichApiKey", label: "FullEnrich API key", hint: "Deep enrichment" },
  { key: "unipileApiUrl", label: "Messaging API URL", hint: "Provider base URL", inputType: "text" },
  { key: "unipileApiKey", label: "Messaging API key", hint: "LinkedIn & hosted WhatsApp" },
  { key: "elevenlabsApiKey", label: "Voice API key", hint: "Voice / conversational calls" },
  { key: "elevenlabsAgentId", label: "Voice agent ID", hint: "e.g. agent_…", inputType: "text" },
  { key: "elevenlabsPhoneNumberId", label: "Outbound phone number ID", hint: "e.g. phnum_…", inputType: "text" },
  { key: "elevenlabsWebhookSecret", label: "Voice webhook secret", hint: "Webhook signature verification" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useNotification();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    company: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<"all" | "with" | "without">("all");
  const [credUser, setCredUser] = useState<UserRow | null>(null);
  const [credConfigured, setCredConfigured] = useState<Record<string, boolean>>({});
  const [credValues, setCredValues] = useState<Partial<Record<CredKey, string>>>({});
  const [credTouched, setCredTouched] = useState<Partial<Record<CredKey, boolean>>>({});
  const [credSaving, setCredSaving] = useState(false);
  const [credShowAll, setCredShowAll] = useState(false);
  const [subModalUser, setSubModalUser] = useState<UserRow | null>(null);
  const [subPlanKey, setSubPlanKey] = useState<"basic" | "pro" | "premium">("basic");
  const [subSaving, setSubSaving] = useState(false);
  const [tokenModalUser, setTokenModalUser] = useState<UserRow | null>(null);
  const [tokenBalanceInput, setTokenBalanceInput] = useState("");
  const [tokenMonthlyInput, setTokenMonthlyInput] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [seatsModalUser, setSeatsModalUser] = useState<UserRow | null>(null);
  const [seatsSummary, setSeatsSummary] = useState<AdminSeatsSummary | null>(null);
  const [seatsLoadError, setSeatsLoadError] = useState<string | null>(null);
  const [seatsExtraInput, setSeatsExtraInput] = useState("0");
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [seatsSaving, setSeatsSaving] = useState(false);

  const closeCredModal = () => {
    setCredShowAll(false);
    setCredUser(null);
  };

  const closeSubModal = () => {
    setSubModalUser(null);
  };

  const closeTokenModal = () => {
    setTokenModalUser(null);
  };

  const closeSeatsModal = () => {
    setSeatsModalUser(null);
    setSeatsSummary(null);
    setSeatsLoadError(null);
    setSeatsExtraInput("0");
  };

  const openManageSeats = async (u: UserRow) => {
    setSeatsModalUser(u);
    setSeatsSummary(null);
    setSeatsLoadError(null);
    setSeatsLoading(true);
    try {
      const data = (await apiRequest(`/admin/users/${u.id}/seats`)) as AdminSeatsSummary;
      setSeatsSummary(data);
      setSeatsExtraInput(
        String(
          Math.max(0, Number.isFinite(Number(data.billing_extra_seats)) ? Number(data.billing_extra_seats) : 0)
        )
      );
    } catch (error: unknown) {
      setSeatsLoadError(error instanceof Error ? error.message : "Could not load seat data.");
    } finally {
      setSeatsLoading(false);
    }
  };

  const saveSeatsExtra = async () => {
    if (!seatsModalUser || !seatsSummary || seatsSummary.team_member_only) return;
    const raw = String(seatsExtraInput).replace(/\s/g, "");
    const extra = raw === "" ? 0 : Number.parseInt(raw, 10);
    if (!Number.isFinite(extra) || extra < 0 || extra > 500) {
      showError("Invalid value", "Enter a whole number from 0 to 500 (extra seats on top of the plan).");
      return;
    }
    setSeatsSaving(true);
    try {
      await apiRequest(`/admin/users/${seatsModalUser.id}/seats`, {
        method: "PATCH",
        body: JSON.stringify({ billing_extra_seats: extra }),
      });
      showSuccess(
        "Seats updated",
        seatsSummary.plan_active
          ? `${seatsModalUser.name}'s seat adjustment was saved.`
          : `${seatsModalUser.name}'s extra seats were saved and will apply when they have an active plan.`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sparkai:workspace-seat-allowance-changed", {
            detail: { ownerUserId: seatsModalUser.id },
          })
        );
      }
      closeSeatsModal();
      fetchUsers();
    } catch (error: unknown) {
      showError("Save failed", error instanceof Error ? error.message : "Failed to save seats");
    } finally {
      setSeatsSaving(false);
    }
  };

  const openManageTokens = (u: UserRow) => {
    setTokenModalUser(u);
    setTokenBalanceInput(String(Number(u.ai_prompt_tokens_balance ?? 0)));
    setTokenMonthlyInput(String(Number(u.monthly_ai_prompt_tokens ?? 0)));
  };

  const saveUserTokens = async () => {
    if (!tokenModalUser) return;
    const bal = Number.parseInt(tokenBalanceInput.replace(/\s/g, ""), 10);
    if (!Number.isFinite(bal) || bal < 0 || bal > 99_000_000) {
      showError("Invalid balance", "Enter a whole number between 0 and 99,000,000.");
      return;
    }
    let monthly: number | undefined;
    if (tokenMonthlyInput.trim() !== "") {
      const m = Number.parseInt(tokenMonthlyInput.replace(/\s/g, ""), 10);
      if (!Number.isFinite(m) || m < 0 || m > 99_000_000) {
        showError("Invalid monthly", "Enter a whole number between 0 and 99,000,000, or leave empty to keep unchanged.");
        return;
      }
      monthly = m;
    }
    setTokenSaving(true);
    try {
      await apiRequest(`/admin/users/${tokenModalUser.id}/ai-prompt-tokens`, {
        method: "PATCH",
        body: JSON.stringify({
          ai_prompt_tokens_balance: bal,
          ...(typeof monthly === "number" ? { monthly_ai_prompt_tokens: monthly } : {}),
        }),
      });
      closeTokenModal();
      fetchUsers();
      showSuccess("Tokens updated", `${tokenModalUser.name}'s AI prompt token settings were saved.`);
    } catch (error: unknown) {
      showError("Save failed", error instanceof Error ? error.message : "Failed to save tokens");
    } finally {
      setTokenSaving(false);
    }
  };

  const openManageSubscription = (u: UserRow) => {
    const current = u.billing_plan_key;
    const match = SUBSCRIPTION_PLAN_OPTIONS.find((p) => p.key === current);
    setSubPlanKey(match ? match.key : "basic");
    setSubModalUser(u);
  };

  const applySubscriptionPlan = async () => {
    if (!subModalUser) return;
    setSubSaving(true);
    try {
      const data = (await apiRequest(`/admin/users/${subModalUser.id}/subscription`, {
        method: "POST",
        body: JSON.stringify({ action: "apply", planKey: subPlanKey }),
      })) as { user?: UserRow; stripeWarning?: string };
      closeSubModal();
      fetchUsers();
      showSuccess("Subscription updated", `${subModalUser.name} is on ${subPlanKey} with matching credits.`);
      if (data.stripeWarning) showWarning("Stripe", data.stripeWarning);
    } catch (error: unknown) {
      showError("Update failed", error instanceof Error ? error.message : "Failed to update subscription");
    } finally {
      setSubSaving(false);
    }
  };

  const cancelUserSubscription = async () => {
    if (!subModalUser) return;
    const ok = await confirm({
      title: "Cancel subscription?",
      message:
        "This clears their plan, sets lead credits to zero, and clears AI prompt tokens. If they have a Stripe subscription, we will try to cancel it there as well.",
      confirmLabel: "Cancel subscription",
      variant: "danger",
    });
    if (!ok) return;
    setSubSaving(true);
    try {
      const data = (await apiRequest(`/admin/users/${subModalUser.id}/subscription`, {
        method: "POST",
        body: JSON.stringify({ action: "cancel" }),
      })) as { user?: UserRow; stripeWarning?: string };
      closeSubModal();
      fetchUsers();
      showSuccess("Subscription cleared", `${subModalUser.name} no longer has an active plan.`);
      if (data.stripeWarning) showWarning("Stripe", data.stripeWarning);
    } catch (error: unknown) {
      showError("Cancel failed", error instanceof Error ? error.message : "Failed to cancel subscription");
    } finally {
      setSubSaving(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest("/admin/users");
      const usersList = Array.isArray(data) ? data : (data as { users?: UserRow[] })?.users || [];
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "", role: "user", company: "" });
      fetchUsers();
      showSuccess("User created", "The account is ready.");
    } catch (error: unknown) {
      showError("Create failed", error instanceof Error ? error.message : "Failed to create user");
    }
  };

  const handleUpdateRole = async (user: UserRow) => {
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: user.role === "admin" ? "user" : "admin" }),
      });
      fetchUsers();
      showSuccess("User updated", "Role was changed.");
    } catch (error: unknown) {
      showError("Update failed", error instanceof Error ? error.message : "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    const ok = await confirm({
      title: "Delete user?",
      message:
        "This permanently removes the user from the platform. Any workspaces they own are reassigned to your account.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: "DELETE" });
      fetchUsers();
      showSuccess("User deleted", "The user was removed.");
    } catch (error: unknown) {
      showError("Delete failed", error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const openCredentials = async (u: UserRow) => {
    setCredUser(u);
    setCredShowAll(false);
    setCredTouched({});
    try {
      const data = (await apiRequest(`/admin/users/${u.id}/api-credentials`)) as {
        configured?: Record<string, boolean>;
        values?: Partial<Record<CredKey, string>>;
      };
      setCredConfigured(data?.configured || {});
      const next: Partial<Record<CredKey, string>> = {};
      for (const { key } of CRED_FIELDS) {
        next[key] = data.values?.[key] ?? "";
      }
      setCredValues(next);
    } catch {
      setCredConfigured({});
      setCredValues({});
      showError("Load failed", "Could not load credentials.");
    }
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credUser) return;
    setCredSaving(true);
    try {
      const body: Partial<Record<CredKey, string>> = {};
      for (const { key } of CRED_FIELDS) {
        if (credTouched[key]) {
          body[key] = (credValues[key] ?? "").trim();
        }
      }
      await apiRequest(`/admin/users/${credUser.id}/api-credentials`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      showSuccess("Saved", "API credentials updated for this user.");
      closeCredModal();
    } catch (error: unknown) {
      showError("Save failed", error instanceof Error ? error.message : "Failed to save credentials");
    } finally {
      setCredSaving(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      company: u.company || "",
      password: "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const body: Record<string, string> = {
        name: editForm.name,
        email: editForm.email,
        company: editForm.company,
      };
      if (editForm.password.trim().length >= 6) {
        body.password = editForm.password;
      }
      await apiRequest(`/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditUser(null);
      fetchUsers();
      showSuccess("Saved", "User profile was updated.");
    } catch (error: unknown) {
      showError("Save failed", error instanceof Error ? error.message : "Failed to save");
    }
  };

  const seatsPreviewExtra = useMemo(() => {
    const raw = String(seatsExtraInput).replace(/\s/g, "");
    if (raw === "") return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(500, Math.max(0, n));
  }, [seatsExtraInput]);

  const seatsPreviewTotal = useMemo(() => {
    if (!seatsSummary) return 0;
    return Math.max(1, seatsSummary.included_seats_from_plan + seatsPreviewExtra);
  }, [seatsSummary, seatsPreviewExtra]);

  const filteredUsers = useMemo(() => {
    return users.filter((row) => {
      if (companyFilter === "with" && !(row.company && row.company.trim())) return false;
      if (companyFilter === "without" && row.company && row.company.trim()) return false;
      return adminMatchesSearch(search, [row.name, row.email, row.company, row.role, String(row.id)]);
    });
  }, [users, search, companyFilter]);

  const modalShell = (title: string, onClose: () => void, children: React.ReactNode, maxWidthPx = 440) => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2200,
        padding: "12px 10px",
        boxSizing: "border-box",
      }}
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 14,
          padding: 0,
          width: "100%",
          maxWidth: maxWidthPx,
          maxHeight: "min(82vh, 620px)",
          border: "1px solid var(--color-border)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-users-modal-title"
      >
        <h2
          id="admin-users-modal-title"
          style={{
            fontSize: 17,
            fontWeight: 600,
            margin: 0,
            padding: "14px 18px 10px",
            flexShrink: 0,
            borderBottom: "1px solid var(--color-border)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "14px 18px 18px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, company, ID…"
        resultHint={!loading ? `${filteredUsers.length} of ${users.length} users` : undefined}
        filters={
          <select
            className="input"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value as "all" | "with" | "without")}
            aria-label="Company filter"
            style={{ minWidth: 160, fontSize: 13 }}
          >
            <option value="all">All companies</option>
            <option value="with">With company</option>
            <option value="without">No company</option>
          </select>
        }
        right={
          <>
            <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
              Add user
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin")}>
              Overview
            </button>
          </>
        }
      />

      {loading ? (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <TableSkeleton columns={6} rows={10} withCard={false} trailingActions ariaLabel="Loading users" />
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Name</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Email</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Role</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Company</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Created</th>
                <th style={{ padding: 16, textAlign: "right", fontSize: 14, fontWeight: 600, width: 56 }}> </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: 16, fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AdminUserAvatar avatarUrl={row.avatar_url} name={row.name} email={row.email} size={32} />
                      <span style={{ fontWeight: 600 }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: 16, fontSize: 14 }}>{row.email}</td>
                  <td style={{ padding: 16, fontSize: 14 }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: row.role === "admin" ? "rgba(var(--color-primary-rgb), 0.2)" : "rgba(var(--color-primary-rgb), 0.2)",
                        color: row.role === "admin" ? "#F29F67" : "var(--color-primary)",
                      }}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td style={{ padding: 16, fontSize: 14, color: "var(--color-text-muted)" }}>{row.company || "—"}</td>
                  <td style={{ padding: 16, fontSize: 14, color: "var(--color-text-muted)" }}>
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 16, textAlign: "right" }}>
                    <AdminActionsMenu
                      ariaLabel={`Actions for ${row.name}`}
                      items={[
                        { key: "edit", label: "Edit profile", onClick: () => openEdit(row) },
                        {
                          key: "creds",
                          label: "API credentials",
                          onClick: () => {
                            void openCredentials(row);
                          },
                        },
                        {
                          key: "sub",
                          label: "Manage subscription",
                          onClick: () => openManageSubscription(row),
                        },
                        {
                          key: "tokens",
                          label: "Manage AI prompt tokens",
                          onClick: () => openManageTokens(row),
                        },
                        {
                          key: "seats",
                          label: "Manage seats",
                          onClick: () => {
                            void openManageSeats(row);
                          },
                        },
                        { key: "role", label: row.role === "admin" ? "Make user" : "Make admin", onClick: () => handleUpdateRole(row) },
                        { key: "del", label: "Delete", danger: true, onClick: () => handleDeleteUser(row.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal &&
        modalShell(
          "Add user",
          () => setShowAddModal(false),
          <form onSubmit={handleCreateUser}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <input
                className="input"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
              <select
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <input
                className="input"
                placeholder="Company (optional)"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create
              </button>
            </div>
          </form>
        )}

      {subModalUser &&
        modalShell(
          `Manage subscription — ${subModalUser.name}`,
          closeSubModal,
          <div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
              Current plan:{" "}
              <strong>{subModalUser.billing_plan_key || "None"}</strong>
              {" · "}
              Credits: <strong>{Number(subModalUser.credits_balance ?? 0)}</strong>
              {" · "}
              Monthly allowance: <strong>{Number(subModalUser.monthly_lead_credits ?? 0)}</strong>
              {" · "}
              AI prompt tokens: <strong>{Number(subModalUser.ai_prompt_tokens_balance ?? 0).toLocaleString()}</strong>
              {" / "}
              <strong>{Number(subModalUser.monthly_ai_prompt_tokens ?? 0).toLocaleString()}</strong> monthly cap
            </p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Grant / change plan</label>
            <select
              className="input"
              value={subPlanKey}
              onChange={(e) => setSubPlanKey(e.target.value as "basic" | "pro" | "premium")}
              style={{ width: "100%", marginBottom: 8 }}
              disabled={subSaving}
            >
              {SUBSCRIPTION_PLAN_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} — {p.credits} credits / month · {p.aiTokens.toLocaleString()} AI prompt tokens
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 20 }}>
              Applying a plan sets lead credits and AI prompt tokens to that tier&apos;s monthly pools (same as after
              checkout). If they had a paid Stripe subscription, it is canceled first so billing does not overlap.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" className="btn-primary" disabled={subSaving} onClick={() => void applySubscriptionPlan()}>
                {subSaving ? "Saving…" : "Apply selected plan"}
              </button>
              <button type="button" className="btn-ghost" disabled={subSaving} onClick={() => void cancelUserSubscription()}>
                Cancel subscription (zero credits and tokens)
              </button>
              <button type="button" className="btn-ghost" disabled={subSaving} onClick={closeSubModal}>
                Close
              </button>
            </div>
          </div>,
          460
        )}

      {seatsModalUser &&
        modalShell(
          `Manage seats — ${seatsModalUser.name}`,
          closeSeatsModal,
          <div>
            {seatsLoading ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Loading seat data…</p>
            ) : seatsLoadError ? (
              <p style={{ margin: 0, fontSize: 14, color: "#dc2626" }}>{seatsLoadError}</p>
            ) : seatsSummary ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 650,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-secondary)",
                      color: "var(--color-text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {seatsSummary.plan_active ? "Plan" : "Previous plan"}: {seatsSummary.billing_plan_key || "—"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 650,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: `1px solid ${seatsSummary.plan_active ? "rgba(34, 197, 94, 0.35)" : "rgba(248, 113, 113, 0.35)"}`,
                      background: seatsSummary.plan_active ? "rgba(34, 197, 94, 0.12)" : "rgba(248, 113, 113, 0.10)",
                      color: seatsSummary.plan_active ? "#16a34a" : "#ef4444",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {seatsSummary.plan_active ? "Active" : "Inactive"}
                  </span>
                  {seatsSummary.billing_expires_at ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--color-border)",
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Expires (UTC):{" "}
                      {new Date(seatsSummary.billing_expires_at).toLocaleString(undefined, { timeZone: "UTC" })}
                    </span>
                  ) : null}
                </div>

                {seatsSummary.team_member_only ? (
                  <div role="status" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text)", marginBottom: 16 }}>
                    Invite-only <strong>team</strong> account — change seats on the workspace <strong>owner</strong> user,
                    not here.
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button type="button" className="btn-ghost" onClick={closeSeatsModal}>
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 10px", lineHeight: 1.45 }}>
                      {seatsSummary.plan_active ? (
                        <>
                          Each workspace can have up to <strong>{seatsSummary.effective_total_seats}</strong> people (
                          <strong>{seatsSummary.included_seats_from_plan}</strong> plan +{" "}
                          <strong>{Math.max(0, seatsSummary.billing_extra_seats)}</strong> extra).
                        </>
                      ) : (
                        <>
                          <strong>No active plan.</strong> Team seats are paused (owner-only). Extra seats are saved and
                          apply automatically when a plan becomes active.
                        </>
                      )}
                    </p>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" }}>
                      Extra seats (0–500)
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        value={seatsExtraInput}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          if (v === "") {
                            setSeatsExtraInput("");
                            return;
                          }
                          const n = Math.min(500, parseInt(v, 10));
                          setSeatsExtraInput(String(Number.isFinite(n) ? n : 0));
                        }}
                        style={{ width: 120 }}
                        disabled={seatsSaving}
                      />
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        If you save: up to <strong style={{ color: "var(--color-text)" }}>{seatsPreviewTotal}</strong>{" "}
                        people per workspace
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button type="button" className="btn-ghost" disabled={seatsSaving} onClick={closeSeatsModal}>
                        Close
                      </button>
                      <button type="button" className="btn-primary" disabled={seatsSaving} onClick={() => void saveSeatsExtra()}>
                        {seatsSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>No data.</p>
            )}
          </div>,
          400
        )}

      {tokenModalUser &&
        modalShell(
          `AI prompt tokens — ${tokenModalUser.name}`,
          closeTokenModal,
          <div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
              1 token = 1 character deducted from the user&apos;s balance after a successful AI lead generation (when at
              least one lead is saved). Max prompt length in the product is 150 characters per run.
            </p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Token balance</label>
            <input
              className="input"
              type="number"
              min={0}
              max={99_000_000}
              value={tokenBalanceInput}
              onChange={(e) => setTokenBalanceInput(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
              disabled={tokenSaving}
            />
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Monthly cap (optional, for display)
            </label>
            <input
              className="input"
              type="number"
              min={0}
              max={99_000_000}
              placeholder="Leave empty to keep current"
              value={tokenMonthlyInput}
              onChange={(e) => setTokenMonthlyInput(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
              disabled={tokenSaving}
            />
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 20 }}>
              Changing only the balance leaves the monthly snapshot as-is unless you set a new monthly cap above.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" disabled={tokenSaving} onClick={closeTokenModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={tokenSaving} onClick={() => void saveUserTokens()}>
                {tokenSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>,
          420
        )}

      {credUser &&
        modalShell(
          `API credentials — ${credUser.name}`,
          closeCredModal,
          <form onSubmit={saveCredentials} key={credUser.id}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input type="checkbox" checked={credShowAll} onChange={(e) => setCredShowAll(e.target.checked)} />
              Show all values (reveals secrets on screen)
            </label>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
              Values are encrypted at rest. Saved values load when you reopen this dialog. Only fields you edit are sent on
              save — untouched fields keep their stored value. Clear a key by editing it to empty and saving.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {CRED_FIELDS.map(({ key, label, hint, inputType }) => {
                const useText = inputType === "text" || credShowAll;
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                      {credConfigured[key] ? (
                        <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>On file</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Not set</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{hint}</p>
                    <input
                      className="input"
                      type={useText ? "text" : "password"}
                      autoComplete="off"
                      placeholder={credConfigured[key] ? "Leave as-is or replace" : "Paste value"}
                      value={credValues[key] ?? ""}
                      onChange={(e) => {
                        setCredValues((prev) => ({ ...prev, [key]: e.target.value }));
                        setCredTouched((prev) => ({ ...prev, [key]: true }));
                      }}
                      style={{ width: "100%" }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn-ghost" onClick={closeCredModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={credSaving}>
                {credSaving ? "Saving…" : "Save credentials"}
              </button>
            </div>
          </form>,
          460
        )}

      {editUser &&
        modalShell(
          "Edit user",
          () => setEditUser(null),
          <form onSubmit={saveEdit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <input
                className="input"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Company"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              />
              <input
                className="input"
                type="password"
                placeholder="New password (optional, min 6)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                minLength={6}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" onClick={() => setEditUser(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
