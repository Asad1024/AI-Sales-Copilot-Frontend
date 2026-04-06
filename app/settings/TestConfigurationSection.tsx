"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { useNotification } from "@/context/NotificationContext";
import BaseCard from "@/components/ui/BaseCard";

export function TestConfigurationSection() {
  const { showSuccess, showError } = useNotification();

  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [showTestWhatsAppModal, setShowTestWhatsAppModal] = useState(false);
  const [showTestLinkedInModal, setShowTestLinkedInModal] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);

  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingLinkedIn, setTestingLinkedIn] = useState(false);
  const [testingCall, setTestingCall] = useState(false);

  const [testEmailTo, setTestEmailTo] = useState("");
  const [testWhatsAppNumber, setTestWhatsAppNumber] = useState("");
  const [testLinkedInUrl, setTestLinkedInUrl] = useState("");
  const [testCallNumber, setTestCallNumber] = useState("");

  const handleTestEmailConfiguration = async () => {
    if (!testEmailTo.trim()) {
      showError("Validation", "Please enter a recipient email address.");
      return;
    }
    setTestingEmail(true);
    try {
      const response = await apiRequest("/config/test-email", {
        method: "POST",
        body: JSON.stringify({ to: testEmailTo.trim() }),
      });
      showSuccess("Test email", response?.message || "Test email sent.");
      setShowTestEmailModal(false);
      setTestEmailTo("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send test email";
      showError("Test failed", message);
    } finally {
      setTestingEmail(false);
    }
  };

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
    setTestingCall(true);
    try {
      const response = await apiRequest("/config/test-call", {
        method: "POST",
        body: JSON.stringify({ phone: testCallNumber.trim() }),
      });
      showSuccess("Call test", response?.message || "Call configuration test successful.");
      setShowTestCallModal(false);
      setTestCallNumber("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to test call configuration";
      showError("Test failed", message);
    } finally {
      setTestingCall(false);
    }
  };

  const channelTiles = [
    {
      Icon: Icons.Mail,
      label: "Email",
      description: "SMTP / send pipeline",
      open: () => setShowTestEmailModal(true),
    },
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
      description: "Twilio test call",
      open: () => setShowTestCallModal(true),
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
          Run checks against your current backend configuration. LinkedIn and WhatsApp tests send a real message from
          your connected Unipile account to the profile or number you enter. Each flow opens a short form.
        </p>
      </BaseCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {channelTiles.map(({ Icon, label, description, open }) => (
          <button
            key={label}
            type="button"
            onClick={open}
            className="header-utility-btn"
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

      {showTestEmailModal && (
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
          onClick={() => !testingEmail && setShowTestEmailModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BaseCard style={{ width: "min(520px, 100%)", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(99,102,241,0.12)",
                    border: "0.5px solid rgba(99,102,241,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.Mail size={18} strokeWidth={1.5} style={{ color: "#a5b4fc" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Test email</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Uses your server SMTP / mail settings.
                  </p>
                </div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>Recipient</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  marginBottom: 18,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost" style={{ borderRadius: 8 }} disabled={testingEmail} onClick={() => setShowTestEmailModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ borderRadius: 8 }}
                  disabled={testingEmail || !testEmailTo.trim()}
                  onClick={handleTestEmailConfiguration}
                >
                  {testingEmail ? "Sending…" : "Send"}
                </button>
              </div>
            </BaseCard>
          </div>
        </div>
      )}

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
                Sends a short test from your Unipile LinkedIn account. If you are not already connected on LinkedIn,
                the recipient may get a connection invite instead of a DM.
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
                <button type="button" className="btn-ghost" style={{ borderRadius: 8 }} disabled={testingLinkedIn} onClick={() => setShowTestLinkedInModal(false)}>
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
                Sends a short test from your Unipile WhatsApp number. Use the full number with country code; the
                recipient must use WhatsApp on that number.
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
                <button type="button" className="btn-ghost" style={{ borderRadius: 8 }} disabled={testingWhatsApp} onClick={() => setShowTestWhatsAppModal(false)}>
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

      {showTestCallModal && (
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
          onClick={() => !testingCall && setShowTestCallModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BaseCard style={{ width: "min(520px, 100%)", padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Test call</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>Twilio test call to this number.</p>
              <input
                type="text"
                placeholder="+971501234567"
                value={testCallNumber}
                onChange={(e) => setTestCallNumber(e.target.value)}
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
                <button type="button" className="btn-ghost" style={{ borderRadius: 8 }} disabled={testingCall} onClick={() => setShowTestCallModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ borderRadius: 8 }}
                  disabled={testingCall || !testCallNumber.trim()}
                  onClick={handleTestCallConfiguration}
                >
                  {testingCall ? "…" : "Run"}
                </button>
              </div>
            </BaseCard>
          </div>
        </div>
      )}
    </div>
  );
}
