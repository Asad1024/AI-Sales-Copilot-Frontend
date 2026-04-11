"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import { adminMatchesSearch } from "@/lib/adminFilters";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

type CampaignRow = {
  id: number;
  name: string;
  status: string;
  base_id: number;
  Base?: { id: number; name: string };
};

export default function AdminCampaignsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/admin/campaigns?limit=100&offset=0");
      const list = (data as { campaigns?: CampaignRow[] })?.campaigns || [];
      setRows(list);
      setTotal((data as { total?: number })?.total ?? list.length);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusOptions = useMemo(() => {
    const s = new Set(rows.map((r) => (r.status || "").toLowerCase()).filter(Boolean));
    return ["all", ...Array.from(s).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const st = (r.status || "").toLowerCase();
      if (statusFilter !== "all" && st !== statusFilter) return false;
      const baseName = r.Base?.name ?? "";
      return adminMatchesSearch(search, [r.name, baseName, r.status, String(r.id), String(r.base_id)]);
    });
  }, [rows, search, statusFilter]);

  const remove = async (id: number) => {
    const ok = await confirm({
      title: "Delete campaign?",
      message: "This removes the campaign and related scheduling for all users.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/admin/campaigns/${id}`, { method: "DELETE" });
      showSuccess("Deleted", "Campaign removed.");
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
        searchPlaceholder="Search name, workspace, status, ID…"
        resultHint={!loading ? `${filteredRows.length} of ${rows.length} in view · ${total} total` : undefined}
        filters={
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Status filter"
            style={{ minWidth: 140, fontSize: 13 }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        }
        right={
          <>
            <button type="button" className="btn-ghost" onClick={() => load()} disabled={loading}>
              Refresh
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin")}>
              Overview
            </button>
          </>
        }
      />

      {loading ? (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
          <TableSkeleton columns={5} rows={8} withCard={false} trailingActions ariaLabel="Loading campaigns" />
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Name</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Workspace</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Status</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Base ID</th>
                <th style={{ padding: 16, textAlign: "right", width: 56 }}> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
                    No campaigns match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((c) => {
                  const baseName = c.Base?.name ?? "—";
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: 16, fontSize: 14, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: 16, fontSize: 14 }}>{baseName}</td>
                      <td style={{ padding: 16, fontSize: 14 }}>{c.status}</td>
                      <td style={{ padding: 16, fontSize: 14, color: "var(--color-text-muted)" }}>{c.base_id}</td>
                      <td style={{ padding: 16, textAlign: "right" }}>
                        <AdminActionsMenu
                          ariaLabel={`Actions for ${c.name}`}
                          items={[
                            {
                              key: "copy",
                              label: "Copy campaign ID",
                              onClick: () => {
                                void navigator.clipboard?.writeText(String(c.id));
                                showSuccess("Copied", `Campaign ID ${c.id}`);
                              },
                            },
                            { key: "del", label: "Delete", danger: true, onClick: () => remove(c.id) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
