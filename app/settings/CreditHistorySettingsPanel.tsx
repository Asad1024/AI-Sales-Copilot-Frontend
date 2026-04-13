"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useBase } from "@/context/BaseContext";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import BaseCard from "@/components/ui/BaseCard";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

const ENTRIES_PAGE_SIZE = 10;

type LedgerEntry = {
  id: number;
  amount: number;
  balance_after: number;
  operation_type: string;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
  spender: { id: number; name: string; email: string } | null;
};

type EntriesPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type WorkspaceCreditsResponse = {
  base_id: number;
  owner: { id: number; name: string; email: string };
  credits_balance: number;
  monthly_lead_credits: number;
  billing_plan_key: string | null;
  entries: LedgerEntry[];
  entries_pagination?: EntriesPagination;
};

function formatOpLabel(operationType: string): string {
  if (operationType === "lead_completion") return "Lead completion credit";
  return operationType.replace(/_/g, " ");
}

export function CreditHistorySettingsPanel() {
  const { activeBaseId } = useBase();
  const { showError } = useNotification();
  const [data, setData] = useState<WorkspaceCreditsResponse | null>(null);
  const [entriesPage, setEntriesPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLedgerPage = useCallback(
    async (baseId: number, page: number) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: String(Math.max(1, page)),
          limit: String(ENTRIES_PAGE_SIZE),
        });
        const res = (await apiRequest(`/bases/${baseId}/workspace-credits?${qs.toString()}`)) as WorkspaceCreditsResponse;
        setData(res);
        const serverPage = res.entries_pagination?.page;
        if (typeof serverPage === "number" && serverPage >= 1) {
          setEntriesPage(serverPage);
        } else {
          setEntriesPage(page);
        }
      } catch (e: unknown) {
        setData(null);
        const msg = e instanceof Error ? e.message : "Could not load credit history";
        showError("Load failed", msg);
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  useLayoutEffect(() => {
    setEntriesPage(1);
  }, [activeBaseId]);

  useEffect(() => {
    if (!activeBaseId) {
      setData(null);
      setLoading(false);
      return;
    }
    void fetchLedgerPage(activeBaseId, entriesPage);
  }, [activeBaseId, entriesPage, fetchLedgerPage]);

  useEffect(() => {
    const onBase = () => {
      if (!activeBaseId) return;
      setEntriesPage(1);
      void fetchLedgerPage(activeBaseId, 1);
    };
    const onFocus = () => {
      if (!activeBaseId) return;
      void fetchLedgerPage(activeBaseId, entriesPage);
    };
    if (typeof window === "undefined") return;
    window.addEventListener("sparkai:active-base-changed", onBase);
    window.addEventListener("sparkai:user-changed", onBase);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("sparkai:active-base-changed", onBase);
      window.removeEventListener("sparkai:user-changed", onBase);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeBaseId, entriesPage, fetchLedgerPage]);

  if (!activeBaseId) {
    return (
      <p className="text-sm text-gray-600">
        Select a workspace from the sidebar to see this workspace&apos;s shared credits and history.
      </p>
    );
  }

  if (loading && !data) {
    return (
      <div style={{ minHeight: 280, width: "100%" }}>
        <GlobalPageLoader
          layout="embedded"
          minHeight={280}
          message="Loading credit history…"
          ariaLabel="Loading credit history"
        />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-gray-600">No data for this workspace.</p>;
  }

  const entPag = data.entries_pagination;
  const entTotal = entPag?.total ?? data.entries.length;
  const entPage = entPag?.page ?? entriesPage;
  const entLimit = entPag?.limit ?? ENTRIES_PAGE_SIZE;
  const entTotalPages = entPag?.total_pages ?? 1;
  const entRangeFrom = entTotal === 0 ? 0 : (entPage - 1) * entLimit + 1;
  const entRangeTo = Math.min(entPage * entLimit, entTotal);

  return (
    <div className="max-w-[900px] space-y-5">
      <BaseCard className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Workspace credit pool</div>
        <p className="mt-1 text-sm text-gray-600">
          Credits are billed to <strong className="text-gray-900">{data.owner.name}</strong> (workspace owner). All members
          share this balance when working in this workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-8">
          <div>
            <div className="text-xs font-medium text-gray-500">Balance</div>
            <div className="text-2xl font-extrabold text-[var(--color-primary,#7C3AED)]">{data.credits_balance}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Monthly allowance</div>
            <div className="text-2xl font-bold text-gray-900">{data.monthly_lead_credits}</div>
          </div>
          {data.billing_plan_key ? (
            <div>
              <div className="text-xs font-medium text-gray-500">Plan</div>
              <div className="text-sm font-semibold text-gray-900">{data.billing_plan_key}</div>
            </div>
          ) : null}
        </div>
      </BaseCard>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Activity</h3>
        <p className="mb-3 text-xs text-gray-500">
          Each row shows who triggered a spend (when known) and the owner&apos;s balance after the change.
        </p>
        <div className="overflow-x-auto rounded-xl border border-[#E5E3F0] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E3F0] bg-gray-50/80">
                <th className="px-3 py-2.5 font-semibold text-gray-600">When</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">By</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">What</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Credits</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {entTotal === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No credit activity yet for this workspace.
                  </td>
                </tr>
              ) : data.entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No rows on this page.
                  </td>
                </tr>
              ) : (
                data.entries.map((row) => {
                  const when = row.created_at ? new Date(row.created_at).toLocaleString() : "—";
                  const by = row.spender?.name?.trim() || row.spender?.email || "System / automation";
                  const ref =
                    row.reference_type && row.reference_id != null
                      ? `${row.reference_type} #${row.reference_id}`
                      : "—";
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{when}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-gray-800" title={by}>
                        {by}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        <span className="font-medium">{formatOpLabel(row.operation_type)}</span>
                        {ref !== "—" ? <span className="ml-1 text-xs text-gray-400">({ref})</span> : null}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-rose-600">{row.amount}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">{row.balance_after}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {entTotalPages > 1 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing {entRangeFrom}–{entRangeTo} of {entTotal} · Page {entPage} of {entTotalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={entPage <= 1 || loading}
                onClick={() => setEntriesPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={entPage >= entTotalPages || loading}
                onClick={() => setEntriesPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
