"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import BaseCard from "@/components/ui/BaseCard";

type WhatsAppSendRow = {
  id: number;
  sentAt: string;
  phone: string;
};

type WebhookEventRow = {
  event_log_type?: string;
  at?: string;
  unipile_event?: unknown;
};

type StatusResponse = {
  phone?: string;
  sentAt?: string;
  note?: string;
  events?: {
    sent?: boolean;
    delivered?: boolean;
    seen?: boolean;
    replied?: boolean;
  };
  unipile_send?: unknown;
  webhook_events?: WebhookEventRow[];
};

function StatusRow({ label, ok }: { label: string; ok: boolean | null | undefined }) {
  if (ok === null || ok === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span style={{ fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>—</span>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: ok ? "#22c55e" : "var(--color-text-muted)" }}>
        {ok ? "Yes" : "Not yet"}
      </span>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <div style={{ marginTop: 14 }}>
      {title ? (
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" }}>{title}</div>
      ) : null}
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-secondary)",
          color: "var(--color-text)",
          fontSize: 11,
          lineHeight: 1.45,
          maxHeight: 280,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </pre>
    </div>
  );
}

export function TestWhatsAppSection() {
  const { showSuccess, showError } = useNotification();

  const [sends, setSends] = useState<WhatsAppSendRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const loadSends = useCallback(async () => {
    setListLoading(true);
    try {
      const data = (await apiRequest("/config/test-whatsapp-sends")) as { sends?: WhatsAppSendRow[] };
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
      const data = (await apiRequest(`/config/test-whatsapp-sends/${id}/status`)) as StatusResponse;
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
    if (!phone.trim()) {
      showError("Missing number", "Enter a WhatsApp number with country code.");
      return;
    }
    setSending(true);
    try {
      const res = (await apiRequest("/config/test-whatsapp", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      })) as { message?: string; sent_log_id?: number };
      showSuccess("Sent", res?.message || "Test WhatsApp sent.");
      setPhone("");
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
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Test WhatsApp</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 620 }}>
          Send a test from your connected number, then select the recipient below to see delivery / read flags and the
          Unipile webhook payloads we stored for that test (when your message webhook is configured).
        </p>
      </div>

      <BaseCard style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Send a test</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input
            type="tel"
            placeholder="+971501234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          <button type="button" className="btn-primary" style={{ borderRadius: 8 }} disabled={sending || !phone.trim()} onClick={() => void handleSend()}>
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
        className="test-wa-split"
      >
        <BaseCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, fontSize: 14 }}>
            Your test sends
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
                        background: active ? "rgba(var(--color-primary-rgb), 0.2)" : "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{s.phone || "—"}</div>
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
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Select a number on the left to see webhook data.</p>
          ) : statusLoading && !status ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>Loading status…</p>
          ) : status ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Activity</div>
              {status.note ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>{status.note}</p>
              ) : null}
              <StatusRow label="Sent" ok={status.events?.sent !== false} />
              <StatusRow label="Delivered" ok={!!status.events?.delivered} />
              <StatusRow label="Seen (read receipt)" ok={!!status.events?.seen} />
              <StatusRow label="Reply" ok={!!status.events?.replied} />

              <JsonBlock title="Unipile response (send API)" value={status.unipile_send} />

              {Array.isArray(status.webhook_events) && status.webhook_events.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Webhook payloads (incoming)</div>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 10px", lineHeight: 1.45 }}>
                    Each block is the normalized event body we received from Unipile for this message id.
                  </p>
                  {status.webhook_events.map((w, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
                        {(w.event_log_type || "event").replace(/_/g, " ")}
                        {w.at ? ` · ${formatWhen(String(w.at))}` : ""}
                      </div>
                      <JsonBlock title="Payload" value={w.unipile_event} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "14px 0 0", lineHeight: 1.45 }}>
                  No webhook rows yet. Confirm Unipile → Webhooks points to your API{" "}
                  <code style={{ fontSize: 11 }}>/api/integrations/unipile/message-webhook</code> and includes delivery/read
                  events. This panel refreshes every few seconds.
                </p>
              )}
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
  .test-wa-split { grid-template-columns: 1fr !important; }
}
`,
        }}
      />
    </div>
  );
}
