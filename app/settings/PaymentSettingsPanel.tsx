"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest, setUser, getUser, type User } from "@/lib/apiClient";

type BillingTx = {
  id: number;
  amount_cents: number;
  currency: string;
  status: string;
  plan_key: string | null;
  description: string | null;
  created_at: string;
};

type BillingSummary = {
  billing_plan_key: string | null;
  credits_balance: number;
  monthly_lead_credits: number;
  stripe_customer_id: string | null;
  transactions: BillingTx[];
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

export function PaymentSettingsPanel() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiRequest("/billing/summary")) as BillingSummary;
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = (await apiRequest("/auth/me")) as { user: User };
      if (me?.user) setUser(me.user);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sid = searchParams?.get("session_id");
    if (!sid) return;
    setSuccess("Payment received. Refreshing your account…");
    void (async () => {
      await new Promise((r) => setTimeout(r, 1500));
      await refreshMe();
      await load();
      setSuccess("Payment recorded. Your plan and credits update when Stripe sends the webhook (usually within seconds).");
    })();
  }, [searchParams, load, refreshMe]);

  const planLabel = summary?.billing_plan_key
    ? summary.billing_plan_key.charAt(0).toUpperCase() + summary.billing_plan_key.slice(1)
    : "None";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>Billing & payments</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
          Subscriptions and one-time charges processed by Stripe. Credits reflect your current plan allowance (usage rules
          coming next).
        </p>
      </div>

      {success && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(124, 58, 237, 0.08)",
            border: "1px solid rgba(124, 58, 237, 0.25)",
            fontSize: 14,
            color: "var(--color-text)",
          }}
        >
          {success}
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading && !summary ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : summary ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <div className="card-enhanced" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Current plan
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "var(--color-text)" }}>{planLabel}</div>
            </div>
            <div className="card-enhanced" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Credits balance
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "#7C3AED" }}>{summary.credits_balance}</div>
            </div>
            <div className="card-enhanced" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Monthly allowance
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "var(--color-text)" }}>
                {summary.monthly_lead_credits}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "var(--color-text)" }}>Transactions</h3>
            {summary.transactions.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>No payments yet.</p>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Plan</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.transactions.map((t) => (
                      <tr key={t.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "10px 12px", color: "var(--color-text)" }}>
                          {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--color-text)" }}>{t.plan_key || "—"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{formatMoney(t.amount_cents, t.currency)}</td>
                        <td style={{ padding: "10px 12px" }}>{t.status}</td>
                        <td style={{ padding: "10px 12px", color: "var(--color-text-muted)", maxWidth: 280 }}>
                          {t.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
            Profile cache: plan {getUser()?.billing_plan_key ?? "—"} · credits {getUser()?.credits_balance ?? "—"}. Open{" "}
            <a href="/upgrade" style={{ color: "#7C3AED", fontWeight: 600 }}>
              Upgrade
            </a>{" "}
            to change plan.
          </p>
        </>
      ) : null}
    </div>
  );
}
