"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken, clearAuth, getUser, apiRequest } from "@/lib/apiClient";
import { rememberTeamWorkspaceAfterInvite, readRememberedTeamWorkspaceId } from "@/lib/focusTeamWorkspace";
import { userNeedsOnboarding } from "@/lib/authRouting";
import { API_BASE } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function VerifyRequiredContent() {
  const router = useRouter();
  const params = useSearchParams();
  const invited = params.get("invited") === "1";
  const [mounted, setMounted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldownSec, setResendCooldownSec] = useState(RESEND_COOLDOWN_SECONDS);

  const user = getUser();
  const alreadyVerified = user?.email_verified === true;
  const canClickResend = !alreadyVerified && resendCooldownSec <= 0 && !sending;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (alreadyVerified) return;
    const id = window.setInterval(() => {
      setResendCooldownSec((sec) => (sec <= 0 ? 0 : sec - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [alreadyVerified]);

  useEffect(() => {
    if (!alreadyVerified) return;
    const inv = params.get("invitation")?.trim();
    let cancelled = false;
    (async () => {
      if (inv) {
        try {
          const acceptRes = await apiRequest(`/invitations/${inv}/accept`, { method: "POST" });
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("pendingInvitation");
            const baseId = acceptRes?.base?.id;
            if (baseId) rememberTeamWorkspaceAfterInvite(baseId);
            if (acceptRes?.base?.name) {
              sessionStorage.setItem(
                "invitationAccepted",
                JSON.stringify({
                  baseName: acceptRes.base.name,
                  baseId: baseId ?? undefined,
                  role: acceptRes.role,
                  message: acceptRes.message,
                })
              );
            }
          }
        } catch {
          /* may already be a member or wrong session */
        }
      }
      if (cancelled) return;
      const needsOnboarding = userNeedsOnboarding(getUser());
      const hasInviteBanner =
        typeof window !== "undefined" &&
        Boolean(sessionStorage.getItem("invitationAccepted") || readRememberedTeamWorkspaceId());
      if (needsOnboarding) {
        router.replace("/onboarding");
      } else if (hasInviteBanner) {
        router.replace("/dashboard?invited=true");
      } else {
        router.replace("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alreadyVerified, router, params]);

  const sendAgain = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Could not send email");
      setSent(true);
      setResendCooldownSec(RESEND_COOLDOWN_SECONDS);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (alreadyVerified) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.3)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>You&apos;re already verified</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: 1.5 }}>
            Taking you to onboarding or your dashboard…
          </p>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="2"
            style={{ animation: "verifySpin 1s linear infinite", margin: "0 auto", display: "block" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <style jsx global>{`
          @keyframes verifySpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const leftPanel = (
    <div
      style={{
        flex: 1,
        background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "50%",
          animation: mounted ? "verifyFloat 8s ease-in-out infinite" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%",
          animation: mounted ? "verifyFloat 10s ease-in-out infinite reverse" : "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "480px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#fff", letterSpacing: "-0.02em" }}>Sales Co-Pilot</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>AI-Powered Sales Automation</div>
          </div>
        </div>

        <h1
          style={{
            fontSize: "42px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1.15",
            letterSpacing: "-0.03em",
            margin: "0 0 20px 0",
          }}
        >
          Check your inbox
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.85)",
            lineHeight: "1.7",
            margin: "0 0 40px 0",
          }}
        >
          We use email verification to keep your account secure—whether you signed up with Google or email.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { title: "One quick click", desc: "Open the link we sent to your email address" },
            { title: "Same flow for everyone", desc: "Google or password signup—verify by email before full access" },
            { title: "Didn't get it?", desc: "Check spam, or resend from the form on the right" },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                padding: "16px 18px",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: "600", color: "#fff", fontSize: "14px" }}>{f.title}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "3px" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f8fafc",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      {leftPanel}

      <div
        style={{
          width: "520px",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          background: "#fff",
          transform: mounted ? "translateX(0)" : "translateX(50px)",
          transition: "transform 0.8s ease-out",
        }}
      >
        <div style={{ maxWidth: "360px", width: "100%", margin: "0 auto" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 10px 40px rgba(124, 58, 237, 0.3)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <h2
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Verify your email
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px 0", lineHeight: 1.55 }}>
            We sent a verification link to <strong style={{ color: "#334155" }}>{user?.email || "your inbox"}</strong>. Open it to
            activate your account—required for Google and email sign-ups. If you resend, only the <strong style={{ color: "#334155" }}>newest</strong> link
            works; older emails will not.
            {invited && (
              <>
                <br />
                <br />
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  Your workspace invitation will apply once you verify.
                </span>
              </>
            )}
          </p>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {sent && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#047857",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              Verification email sent. Check your inbox (and spam). Previous links are no longer valid.
            </div>
          )}

          {resendCooldownSec > 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: "13px",
                marginBottom: "16px",
                textAlign: "center",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Resend available in {formatCountdown(resendCooldownSec)}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              type="button"
              onClick={sendAgain}
              disabled={!canClickResend}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: canClickResend ? "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)" : "#cbd5e1",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: canClickResend ? "pointer" : "not-allowed",
                boxShadow: canClickResend ? "0 4px 14px rgba(124, 58, 237, 0.4)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {sending ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "verifySpin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Sending…
                </>
              ) : (
                "Resend verification email"
              )}
            </button>
            <Link
              href="/auth/login"
              onClick={() => clearAuth()}
              style={{
                textAlign: "center",
                fontSize: "14px",
                color: "#64748b",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign out and use a different account
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes verifySpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes verifyFloat {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

export default function VerifyRequiredPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      }
    >
      <VerifyRequiredContent />
    </Suspense>
  );
}
