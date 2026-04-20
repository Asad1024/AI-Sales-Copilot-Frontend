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
  credits_balance?: number;
  monthly_lead_credits?: number;
}

const SUBSCRIPTION_PLAN_OPTIONS = [
  { key: "basic" as const, label: "Basic", credits: 300 },
  { key: "pro" as const, label: "Pro", credits: 500 },
  { key: "premium" as const, label: "Premium", credits: 1000 },
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

  const closeCredModal = () => {
    setCredShowAll(false);
    setCredUser(null);
  };

  const closeSubModal = () => {
    setSubModalUser(null);
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
        "This clears their plan and sets credits to zero. If they have a Stripe subscription, we will try to cancel it there as well.",
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

  const filteredUsers = useMemo(() => {
    return users.filter((row) => {
      if (companyFilter === "with" && !(row.company && row.company.trim())) return false;
      if (companyFilter === "without" && row.company && row.company.trim()) return false;
      return adminMatchesSearch(search, [row.name, row.email, row.company, row.role, String(row.id)]);
    });
  }, [users, search, companyFilter]);

  const modalShell = (title: string, onClose: () => void, children: React.ReactNode, maxWidthPx = 500) => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          padding: 24,
          width: "90%",
          maxWidth: maxWidthPx,
          border: "1px solid var(--color-border)",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{title}</h2>
        {children}
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
                  {p.label} — {p.credits} credits / month
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 20 }}>
              Applying a plan sets their credit balance to that plan&apos;s monthly allowance (same as after checkout). If
              they had a paid Stripe subscription, it is canceled first so billing does not overlap.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" className="btn-primary" disabled={subSaving} onClick={() => void applySubscriptionPlan()}>
                {subSaving ? "Saving…" : "Apply selected plan"}
              </button>
              <button type="button" className="btn-ghost" disabled={subSaving} onClick={() => void cancelUserSubscription()}>
                Cancel subscription and zero credits
              </button>
              <button type="button" className="btn-ghost" disabled={subSaving} onClick={closeSubModal}>
                Close
              </button>
            </div>
          </div>,
          520
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
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
          620
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
