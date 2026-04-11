"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import { adminMatchesSearch } from "@/lib/adminFilters";

const TOPICS = [
  {
    id: "stripe",
    title: "Stripe or Paddle",
    body: "Connect a billing provider to track subscriptions, MRR, trials, and invoices from this screen.",
    tag: "integration",
  },
  {
    id: "seats",
    title: "Seats & access",
    body: "Until billing is live, use Users and Workspaces to control who can use the product and how workspaces are owned.",
    tag: "access",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    body: "Payment provider webhooks can update subscription state and send admin notifications when failures occur.",
    tag: "integration",
  },
];

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("all");

  const tagOptions = useMemo(() => {
    const s = new Set(TOPICS.map((t) => t.tag));
    return ["all", ...Array.from(s)];
  }, []);

  const filtered = useMemo(() => {
    return TOPICS.filter((t) => {
      if (tag !== "all" && t.tag !== tag) return false;
      return adminMatchesSearch(search, [t.title, t.body, t.tag]);
    });
  }, [search, tag]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search topics and guidance…"
        resultHint={`${filtered.length} of ${TOPICS.length} topics`}
        filters={
          <select
            className="input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="Topic type"
            style={{ minWidth: 140, fontSize: 13 }}
          >
            {tagOptions.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t}
              </option>
            ))}
          </select>
        }
        right={
          <>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin/users")}>
              Users
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin/bases")}>
              Workspaces
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              textAlign: "center",
              fontSize: 14,
            }}
          >
            No topics match your search or filter.
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              style={{
                background: "var(--color-surface)",
                borderRadius: 16,
                padding: 18,
                border: "1px solid var(--color-border)",
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-text)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{t.title}</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginBottom: 8 }}>Tag: {t.tag}</div>
              <div>{t.body}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
