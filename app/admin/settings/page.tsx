"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getUser, setUser, type User } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import { adminMatchesSearch } from "@/lib/adminFilters";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const me = getUser();
  const [name, setName] = useState(me?.name ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState<"all" | "profile" | "security">("all");

  const showProfileBlock =
    (focus === "all" || focus === "profile") &&
    (!search.trim() || adminMatchesSearch(search, ["display", "name", "profile", "email", "signed", name, me?.email ?? ""]));

  const showSecurityBlock =
    (focus === "all" || focus === "security") &&
    (!search.trim() || adminMatchesSearch(search, ["password", "security", "optional", "characters"]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.id) return;
    setSaving(true);
    try {
      const body: { name: string; password?: string } = { name: name.trim() || me.name };
      if (password.trim().length >= 6) {
        body.password = password;
      }
      const updated = await apiRequest(`/admin/users/${me.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (updated && typeof updated === "object" && "id" in updated) {
        setUser({ ...me, ...(updated as User) });
      }
      setPassword("");
      showSuccess("Saved", "Your admin profile was updated.");
    } catch (err: unknown) {
      showError("Save failed", err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const anyBlock = showProfileBlock || showSecurityBlock;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search fields (e.g. password, name)…"
        filters={
          <select
            className="input"
            value={focus}
            onChange={(e) => setFocus(e.target.value as "all" | "profile" | "security")}
            aria-label="Section focus"
            style={{ minWidth: 160, fontSize: 13 }}
          >
            <option value="all">All sections</option>
            <option value="profile">Profile only</option>
            <option value="security">Password only</option>
          </select>
        }
        right={
          <>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin/notifications")}>
              Notifications
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin")}>
              Overview
            </button>
          </>
        }
      />

      {!anyBlock ? (
        <div className="text-hint" style={{ padding: 20, textAlign: "center", fontSize: 14 }}>
          No settings match your search or section filter.
        </div>
      ) : (
        <form
          onSubmit={save}
          style={{
            background: "var(--color-surface)",
            borderRadius: 16,
            padding: 24,
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {showProfileBlock && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
                Display name
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Signed in as {me?.email}</div>
            </>
          )}
          {showSecurityBlock && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
              New password (optional)
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </label>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={saving || !anyBlock}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
