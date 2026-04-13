"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";

type AdminPaymentRow = {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  plan_key: string | null;
  description: string | null;
  stripe_checkout_session_id: string | null;
  stripe_invoice_id: string | null;
  createdAt: string;
};

function formatMoney(cents: number, currency: string) {
  const major = cents / 100;
  const cur = currency?.toUpperCase() || "AED";
  try {
    return new Intl.NumberFormat("en-AE", { style: "currency", currency: cur }).format(major);
  } catch {
    return `${major.toFixed(2)} ${cur}`;
  }
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiRequest("/admin/payments")) as { transactions: AdminPaymentRow[] };
        if (!cancelled) setRows(data.transactions || []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "8px 0 24px", maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Payments</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 20px" }}>
        Stripe checkout and subscription invoices (latest 500).
      </p>
      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#b91c1c", marginBottom: 16 }}>{error}</div>
      )}
      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No transactions yet.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>User</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Plan</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Amount</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Stripe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{r.user_name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{r.user_email}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{r.plan_key || "—"}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{formatMoney(r.amount_cents, r.currency)}</td>
                  <td style={{ padding: "10px 12px" }}>{r.status}</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--color-text-muted)", maxWidth: 200 }}>
                    {r.stripe_invoice_id && <div>inv: {r.stripe_invoice_id}</div>}
                    {r.stripe_checkout_session_id && <div>cs: {r.stripe_checkout_session_id.slice(0, 24)}…</div>}
                    {!r.stripe_invoice_id && !r.stripe_checkout_session_id ? "—" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
