"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { useNotification } from "@/context/NotificationContext";
import BaseCard from "@/components/ui/BaseCard";

type TestCallConfigResponse = {
  success?: boolean;
  message?: string;
  answered?: boolean;
  completed?: boolean;
  recipient_status?: string | null;
  elevenlabs_conversation_id?: string | null;
  transcript?: string | null;
  recording_url?: string | null;
  poll_attempts?: number;
  timed_out?: boolean;
};

export function TestConfigurationSection() {
  const { showSuccess, showError } = useNotification();

  const [showTestWhatsAppModal, setShowTestWhatsAppModal] = useState(false);
  const [showTestLinkedInModal, setShowTestLinkedInModal] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);

  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingLinkedIn, setTestingLinkedIn] = useState(false);
  const [testingCall, setTestingCall] = useState(false);

  const [testWhatsAppNumber, setTestWhatsAppNumber] = useState("");
  const [testLinkedInUrl, setTestLinkedInUrl] = useState("");
  const [testCallNumber, setTestCallNumber] = useState("");
  const [callTestOutcome, setCallTestOutcome] = useState<TestCallConfigResponse | null>(null);

  const runChannelTest = async (channel: "linkedin" | "whatsapp") => {
    const endpoint = channel === "linkedin" ? "/config/test-linkedin" : "/config/test-whatsapp";
    const payload =
      channel === "linkedin"
        ? { profile_url: testLinkedInUrl.trim() }
        : { phone: testWhatsAppNumber.trim() };

    if (channel === "linkedin" && !payload.profile_url) {
      showError("Validation", "Please enter a LinkedIn profile URL.");
      return;
    }
    if (channel === "whatsapp" && !payload.phone) {
      showError("Validation", "Please enter a WhatsApp number.");
      return;
    }

    const setLoading = channel === "linkedin" ? setTestingLinkedIn : setTestingWhatsApp;
    setLoading(true);
    try {
      const response = (await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { message?: string; mode?: string };
      let msg = response?.message || `${channel} test successful.`;
      if (channel === "linkedin" && response?.mode) {
        msg = `${msg} (${String(response.mode).replace(/_/g, " ")})`;
      }
      showSuccess("Channel test", msg);
      if (channel === "linkedin") setShowTestLinkedInModal(false);
      else setShowTestWhatsAppModal(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to test ${channel}`;
      showError("Test failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCallConfiguration = async () => {
    if (!testCallNumber.trim()) {
      showError("Validation", "Please enter a phone number.");
      return;
    }
    setCallTestOutcome(null);
    setTestingCall(true);
    try {
      const response = (await apiRequest("/config/test-call", {
        method: "POST",
        body: JSON.stringify({ phone: testCallNumber.trim() }),
      })) as TestCallConfigResponse;
      setCallTestOutcome(response);
      const okMsg =
        response?.message ||
        (response?.timed_out
          ? "Call submitted; polling timed out before a final status."
          : "Call configuration test finished.");
      showSuccess("Call test", okMsg);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to test call configuration";
      showError("Test failed", message);
    } finally {
      setTestingCall(false);
    }
  };

  const channelTiles = [
    {
      Icon: Icons.Linkedin,
      label: "LinkedIn",
      description: "Real test DM or invite via Unipile",
      open: () => setShowTestLinkedInModal(true),
    },
    {
      Icon: Icons.MessageCircle,
      label: "WhatsApp",
      description: "Real test message to a number",
      open: () => setShowTestWhatsAppModal(true),
    },
    {
      Icon: Icons.Phone,
      label: "Call",
      description: "ElevenLabs batch test call",
      open: () => {
        setCallTestOutcome(null);
        setShowTestCallModal(true);
      },
    },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BaseCard style={{ padding: "22px 24px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginBottom: 6,
          }}
        >
          Integrations
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5, maxWidth: 560 }}>
          Run checks against your current backend configuration. LinkedIn and WhatsApp tests send a real message from your
          connected Unipile account. Use the <strong>Test email</strong> tab to verify email delivery and tracking.
        </p>
      </BaseCard>

      <div
        className="test-config-tiles-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {channelTiles.map(({ Icon, label, description, open }) => (
          <button
            key={label}
            type="button"
            onClick={open}
            className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,58,237,0.35)] focus-visible:ring-offset-2"
            aria-label={`Open ${label} test`}
            style={{
              textAlign: "left",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <BaseCard
              style={{
                padding: "18px 18px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                transition: "border-color 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(99,102,241,0.1)",
                  border: "0.5px solid rgba(99,102,241,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} strokeWidth={1.5} style={{ color: "#a5b4fc" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-text)" }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{description}</div>
              <div style={{ marginTop: "auto", fontSize: 11, fontWeight: 600, color: "#818cf8", display: "flex", alignItems: "center", gap: 4 }}>
                Run test
                <Icons.ChevronRight size={14} strokeWidth={1.5} />
              </div>
            </BaseCard>
          </button>
        ))}
      </div>

      {showTestLinkedInModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => !testingLinkedIn && setShowTestLinkedInModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BaseCard style={{ width: "min(520px, 100%)", padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Test LinkedIn</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                Sends a short test from your Unipile LinkedIn account. If you are not already connected on LinkedIn, the
                recipient may get a connection invite instead of a DM.
              </p>
              <input
                type="text"
                placeholder="https://www.linkedin.com/in/username"
                value={testLinkedInUrl}
                onChange={(e) => setTestLinkedInUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 18,
                }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost" disabled={testingLinkedIn} onClick={() => setShowTestLinkedInModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ borderRadius: 8 }}
                  disabled={testingLinkedIn || !testLinkedInUrl.trim()}
                  onClick={() => runChannelTest("linkedin")}
                >
                  {testingLinkedIn ? "…" : "Run"}
                </button>
              </div>
            </BaseCard>
          </div>
        </div>
      )}

      {showTestWhatsAppModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => !testingWhatsApp && setShowTestWhatsAppModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BaseCard style={{ width: "min(520px, 100%)", padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Test WhatsApp</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                Sends a short test from your Unipile WhatsApp number. Use the full number with country code; the recipient
                must use WhatsApp on that number.
              </p>
              <input
                type="text"
                placeholder="+971501234567"
                value={testWhatsAppNumber}
                onChange={(e) => setTestWhatsAppNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 18,
                }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost" disabled={testingWhatsApp} onClick={() => setShowTestWhatsAppModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ borderRadius: 8 }}
                  disabled={testingWhatsApp || !testWhatsAppNumber.trim()}
                  onClick={() => runChannelTest("whatsapp")}
                >
                  {testingWhatsApp ? "…" : "Run"}
                </button>
              </div>
            </BaseCard>
          </div>
        </div>
      )}

      {showTestCallModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              boxSizing: "border-box",
            }}
            onClick={() => !testingCall && setShowTestCallModal(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-call-dialog-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(720px, calc(100vw - 40px))",
                maxWidth: "100%",
                maxHeight: "min(90vh, 800px)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <BaseCard
                style={{
                  width: "100%",
                  padding: 24,
                  maxHeight: "min(90vh, 800px)",
                  overflow: "auto",
                  boxSizing: "border-box",
                }}
              >
              <h3 id="test-call-dialog-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
                Test call
              </h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                Uses ElevenLabs conversational AI (batch calling). Configure API key, agent ID, and phone number ID in
                Admin → Users → API credentials for your user, or set ELEVENLABS_* in the server environment. After you
                run a test, the server waits for the batch recipient to finish (often up to about two minutes) and then
                returns answered, completed, transcript, and recording when available.
              </p>
              <input
                type="text"
                placeholder="+971501234567"
                value={testCallNumber}
                onChange={(e) => setTestCallNumber(e.target.value)}
                disabled={testingCall}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 14,
                }}
              />
              {testingCall && (
                <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                  Placing call and waiting for outcome (this request can take a couple of minutes)…
                </p>
              )}
              {callTestOutcome && !testingCall && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 10,
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                      Outcome
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: callTestOutcome.answered ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
                        color: callTestOutcome.answered ? "#86efac" : "#94a3b8",
                      }}
                    >
                      Answered: {callTestOutcome.answered ? "Yes" : "No"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: callTestOutcome.completed ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
                        color: callTestOutcome.completed ? "#86efac" : "#94a3b8",
                      }}
                    >
                      Completed: {callTestOutcome.completed ? "Yes" : "No"}
                    </span>
                    {callTestOutcome.timed_out && (
                      <span style={{ fontSize: 12, color: "#fbbf24" }}>Polling timed out</span>
                    )}
                  </div>
                  {(callTestOutcome.recipient_status || callTestOutcome.elevenlabs_conversation_id) && (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                      {callTestOutcome.recipient_status != null && callTestOutcome.recipient_status !== "" && (
                        <div>Recipient status: {callTestOutcome.recipient_status}</div>
                      )}
                      {callTestOutcome.elevenlabs_conversation_id && (
                        <div style={{ wordBreak: "break-all" }}>
                          Conversation id: {callTestOutcome.elevenlabs_conversation_id}
                        </div>
                      )}
                      {typeof callTestOutcome.poll_attempts === "number" && (
                        <div>Poll attempts: {callTestOutcome.poll_attempts}</div>
                      )}
                    </div>
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        marginBottom: 6,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Text transcript
                    </div>
                    {callTestOutcome.transcript != null && String(callTestOutcome.transcript).trim() !== "" ? (
                      <pre
                        style={{
                          margin: 0,
                          maxHeight: 240,
                          overflow: "auto",
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 12,
                          lineHeight: 1.45,
                          background: "rgba(0,0,0,0.25)",
                          color: "var(--color-text)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          border: "0.5px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {callTestOutcome.transcript}
                      </pre>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "var(--color-text-muted)",
                          background: "rgba(0,0,0,0.12)",
                          border: "0.5px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        No text transcript was returned for this test. ElevenLabs sometimes finalizes transcripts a few
                        seconds after the call shows completed—try <strong>Run again</strong>, or open this conversation in
                        the ElevenLabs dashboard using the conversation id above.
                      </p>
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        marginBottom: 6,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Audio recording
                    </div>
                    {callTestOutcome.recording_url != null && String(callTestOutcome.recording_url).trim() !== "" ? (
                      <audio
                        controls
                        src={callTestOutcome.recording_url}
                        style={{ width: "100%", height: 40, verticalAlign: "middle" }}
                      />
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "var(--color-text-muted)",
                          background: "rgba(0,0,0,0.12)",
                          border: "0.5px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        No recording URL was returned yet. If the call just finished, wait a moment and run the test
                        again, or use the conversation id in ElevenLabs to download or play the recording there.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={testingCall}
                  onClick={() => {
                    setShowTestCallModal(false);
                    setTestCallNumber("");
                    setCallTestOutcome(null);
                  }}
                >
                  {callTestOutcome ? "Close" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ borderRadius: 8 }}
                  disabled={testingCall || !testCallNumber.trim()}
                  onClick={handleTestCallConfiguration}
                >
                  {testingCall ? "…" : callTestOutcome ? "Run again" : "Run"}
                </button>
              </div>
            </BaseCard>
            </div>
          </div>,
          document.body
        )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 980px) {
  .test-config-tiles-grid {
    grid-template-columns: 1fr !important;
  }
}
`,
        }}
      />
    </div>
  );
}
