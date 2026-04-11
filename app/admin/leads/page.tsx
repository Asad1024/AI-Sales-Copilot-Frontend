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

type LeadRow = {
  id: number;
  base_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  tier?: string;
  createdAt?: string;
  Base?: { id: number; name: string };
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/admin/leads?limit=100&offset=0");
      const list = (data as { leads?: LeadRow[] })?.leads || [];
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

  const tierOptions = useMemo(() => {
    const t = new Set(
      rows
        .map((r) => (r.tier || "").trim())
        .filter(Boolean)
        .map((x) => x.toLowerCase())
    );
    return ["all", ...Array.from(t).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const tier = (r.tier || "").trim().toLowerCase();
      if (tierFilter === "__empty__" && tier) return false;
      if (tierFilter !== "all" && tierFilter !== "__empty__" && tier !== tierFilter) return false;
      const baseName = r.Base?.name ?? "";
      const displayName = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      return adminMatchesSearch(search, [displayName, r.email, r.company, baseName, r.tier, String(r.id), String(r.base_id)]);
    });
  }, [rows, search, tierFilter]);

  const remove = async (id: number) => {
    const ok = await confirm({
      title: "Delete lead?",
      message: "This permanently removes the lead record.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/admin/leads/${id}`, { method: "DELETE" });
      showSuccess("Deleted", "Lead removed.");
      load();
    } catch (err: unknown) {
      showError("Failed", err instanceof Error ? err.message : "Could not delete");
    }
  };

  const nameOf = (r: LeadRow) => {
    const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
    return n || r.email || `Lead #${r.id}`;
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, company, workspace, tier…"
        resultHint={!loading ? `${filteredRows.length} of ${rows.length} in view · ${total} total` : undefined}
        filters={
          <select
            className="input"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            aria-label="Tier filter"
            style={{ minWidth: 140, fontSize: 13 }}
          >
            <option value="all">All tiers</option>
            <option value="__empty__">No tier</option>
            {tierOptions
              .filter((x) => x !== "all")
              .map((t) => (
                <option key={t} value={t}>
                  {t}
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
          <TableSkeleton columns={6} rows={8} withCard={false} trailingActions ariaLabel="Loading leads" />
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Lead</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Email</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Company</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Workspace</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Tier</th>
                <th style={{ padding: 16, textAlign: "right", width: 56 }}> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
                    No leads match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: 16, fontSize: 14, fontWeight: 600 }}>{nameOf(r)}</td>
                    <td style={{ padding: 16, fontSize: 14 }}>{r.email || "—"}</td>
                    <td style={{ padding: 16, fontSize: 14, color: "var(--color-text-muted)" }}>{r.company || "—"}</td>
                    <td style={{ padding: 16, fontSize: 14 }}>{r.Base?.name ?? `Base ${r.base_id}`}</td>
                    <td style={{ padding: 16, fontSize: 14 }}>{r.tier || "—"}</td>
                    <td style={{ padding: 16, textAlign: "right" }}>
                      <AdminActionsMenu
                        ariaLabel={`Actions for lead ${r.id}`}
                        items={[{ key: "del", label: "Delete", danger: true, onClick: () => remove(r.id) }]}
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
