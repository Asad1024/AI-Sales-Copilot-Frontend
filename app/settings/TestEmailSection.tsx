"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import BaseCard from "@/components/ui/BaseCard";
import { useBase } from "@/context/BaseContext";

type EmailSendRow = {
  id: number;
  sentAt: string;
  to: string;
  channel: "smtp" | "resend";
};

type StatusResponse = {
  to?: string;
  sentAt?: string;
  channel?: string;
  note?: string;
  events?: {
    sent?: boolean;
    processed?: boolean;
    delivered?: boolean | null;
    opened?: boolean | null;
    clicked?: boolean | null;
    bounced?: boolean;
    dropped?: boolean;
  };
};

function StatusRow({ label, ok }: { label: string; ok: boolean | null | undefined }) {
  if (ok === null || ok === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>—</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: ok ? "#22c55e" : "var(--color-text-muted)" }}>{ok ? "Yes" : "Not yet"}</span>
    </div>
  );
}

export function TestEmailSection() {
  const { showSuccess, showError } = useNotification();
  const { activeBaseId } = useBase();

  const [sends, setSends] = useState<EmailSendRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const loadSends = useCallback(async () => {
    setListLoading(true);
    try {
      const data = (await apiRequest("/config/test-email-sends")) as { sends?: EmailSendRow[] };
      const list = Array.isArray(data?.sends) ? data.sends : [];
      setSends(
        list.map((s) => ({
          ...s,
          sentAt: typeof s.sentAt === "string" ? s.sentAt : String(s.sentAt),
        }))
      );
    } catch {
      setSends([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSends();
  }, [loadSends]);

  const loadStatus = useCallback(async (id: number) => {
    setStatusLoading(true);
    try {
      const data = (await apiRequest(`/config/test-email-sends/${id}/status`)) as StatusResponse;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setStatus(null);
      return;
    }
    void loadStatus(selectedId);
    const t = window.setInterval(() => {
      void loadStatus(selectedId);
    }, 4000);
    return () => window.clearInterval(t);
  }, [selectedId, loadStatus]);

  const handleSend = async () => {
    if (!to.trim()) {
      showError("Missing email", "Enter a recipient address.");
      return;
    }
    setSending(true);
    try {
      const body: { to: string; base_id?: number } = { to: to.trim() };
      if (typeof activeBaseId === "number" && activeBaseId > 0) {
        body.base_id = activeBaseId;
      }
      const res = (await apiRequest("/config/test-email", {
        method: "POST",
        body: JSON.stringify(body),
      })) as { message?: string; sent_log_id?: number };
      showSuccess("Sent", res?.message || "Test email sent.");
      setTo("");
      await loadSends();
      if (typeof res?.sent_log_id === "number") {
        setSelectedId(res.sent_log_id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not send.";
      showError("Send failed", message);
    } finally {
      setSending(false);
    }
  };

  const formatWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Test email</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 560 }}>
          Send a test message and open the list below to see delivery, opens, and clicks when your provider supports it.
        </p>
      </div>

      <BaseCard style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Send a test</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input
            type="email"
            placeholder="Recipient email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 14,
            }}
          />
          <button type="button" className="btn-primary" style={{ borderRadius: 8 }} disabled={sending || !to.trim()} onClick={() => void handleSend()}>
            {sending ? "Sending…" : "Send test"}
          </button>
        </div>
      </BaseCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="test-email-split"
      >
        <BaseCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, fontSize: 14 }}>
            Your test emails
          </div>
          {listLoading ? (
            <p style={{ padding: 16, margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>Loading…</p>
          ) : sends.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>No sends yet.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 360, overflowY: "auto" }}>
              {sends.map((s) => {
                const active = selectedId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: "1px solid var(--color-border)",
                        background: active ? "rgba(37, 99, 235, 0.08)" : "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{s.to || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{formatWhen(s.sentAt)}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div style={{ padding: 12, borderTop: "1px solid var(--color-border)" }}>
            <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={() => void loadSends()}>
              Refresh list
            </button>
          </div>
        </BaseCard>

        <BaseCard style={{ padding: 20, minHeight: 280 }}>
          {selectedId == null ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Select an email on the left to see status.</p>
          ) : statusLoading && !status ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Loading status…</p>
          ) : status ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Activity</div>
              {status.note ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>{status.note}</p>
              ) : null}
              <StatusRow label="Sent" ok={status.events?.sent !== false} />
              {status.channel === "resend" ? (
                <>
                  <StatusRow label="Delivered" ok={!!status.events?.delivered} />
                  <StatusRow label="Opened" ok={!!status.events?.opened} />
                  <StatusRow label="Clicked" ok={!!status.events?.clicked} />
                </>
              ) : (
                <>
                  <StatusRow label="Delivered" ok={status.events?.delivered} />
                  <StatusRow label="Opened" ok={status.events?.opened} />
                  <StatusRow label="Clicked" ok={status.events?.clicked} />
                </>
              )}
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "12px 0 0", lineHeight: 1.45 }}>
                Status updates every few seconds after you send. Open the message in your inbox and tap the link to see opens and clicks.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Could not load status.</p>
          )}
        </BaseCard>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 900px) {
  .test-email-split { grid-template-columns: 1fr !important; }
}
`,
        }}
      />
    </div>
  );
}
