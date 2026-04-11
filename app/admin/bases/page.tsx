"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import { adminMatchesSearch } from "@/lib/adminFilters";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

type BaseRow = {
  id: number;
  name: string;
  user_id: number;
  User?: { id: number; email: string; name: string; avatar_url?: string | null };
};

export default function AdminBasesPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const [rows, setRows] = useState<BaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "with" | "without">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/admin/bases");
      const list = (data as { bases?: BaseRow[] })?.bases || [];
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    return rows.filter((b) => {
      const hasOwner = Boolean(b.User?.email || b.User?.name);
      if (ownerFilter === "with" && !hasOwner) return false;
      if (ownerFilter === "without" && hasOwner) return false;
      return adminMatchesSearch(search, [b.name, b.User?.name, b.User?.email, String(b.id), String(b.user_id)]);
    });
  }, [rows, search, ownerFilter]);

  const remove = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete workspace?",
      message: `Permanently delete "${name}" and its members? Campaigns and leads in this workspace may be affected depending on database rules.`,
      confirmLabel: "Delete workspace",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/bases/${id}`, { method: "DELETE" });
      showSuccess("Deleted", "Workspace removed.");
      load();
    } catch (err: unknown) {
      showError("Failed", err instanceof Error ? err.message : "Could not delete");
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search workspace, owner, email, ID…"
        resultHint={!loading ? `${filteredRows.length} of ${rows.length} workspaces` : undefined}
        filters={
          <select
            className="input"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value as "all" | "with" | "without")}
            aria-label="Owner filter"
            style={{ minWidth: 160, fontSize: 13 }}
          >
            <option value="all">All workspaces</option>
            <option value="with">With owner profile</option>
            <option value="without">Missing owner profile</option>
          </select>
        }
        right={
          <>
            <button type="button" className="btn-ghost" onClick={() => load()} disabled={loading}>
              Refresh
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin/users")}>
              Users
            </button>
          </>
        }
      />

      {loading ? (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
          <TableSkeleton columns={4} rows={8} withCard={false} trailingActions ariaLabel="Loading workspaces" />
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Name</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Owner</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Owner email</th>
                <th style={{ padding: 16, textAlign: "right", width: 56 }}> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
                    No workspaces match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: 16, fontSize: 14, fontWeight: 600 }}>{b.name}</td>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {b.User?.name ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AdminUserAvatar
                            avatarUrl={b.User?.avatar_url}
                            name={b.User?.name}
                            email={b.User?.email}
                            size={32}
                          />
                          <span style={{ fontWeight: 600 }}>{b.User.name}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, color: "var(--color-text-muted)" }}>{b.User?.email ?? "—"}</td>
                    <td style={{ padding: 16, textAlign: "right" }}>
                      <AdminActionsMenu
                        ariaLabel={`Actions for ${b.name}`}
                        items={[
                          {
                            key: "copy",
                            label: "Copy workspace ID",
                            onClick: () => {
                              void navigator.clipboard?.writeText(String(b.id));
                              showSuccess("Copied", `Workspace ID ${b.id}`);
                            },
                          },
                          { key: "del", label: "Delete workspace", danger: true, onClick: () => remove(b.id, b.name) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
