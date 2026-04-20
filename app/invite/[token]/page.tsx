"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BaseCard from "@/components/ui/BaseCard";
import { Icons } from "@/components/ui/Icons";

interface InvitationDetails {
  base_name: string;
  role: string;
  inviter_name: string;
  email: string;
  expires_at: string;
}

const NAV_HEIGHT = 56;

const FIELD_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  marginBottom: 4,
};

const FIELD_VALUE: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--color-text)",
  wordBreak: "break-word",
};

function InvitePublicHeader() {
  return (
    <header
      style={{
        height: NAV_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(16px, 4vw, 32px)",
        borderBottom: "1px solid var(--elev-border, var(--color-border))",
        background: "var(--elev-bg, var(--color-surface))",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <AppBrandLogoLockup height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/auth/login"
          className="btn-dashboard-outline focus-ring"
          style={{
            borderRadius: 8,
            fontSize: 14,
            padding: "8px 16px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          Sign in
        </Link>
        <ThemeToggle compact />
      </div>
    </header>
  );
}

function InvitePageShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-background)",
        color: "var(--color-text)",
      }}
    >
      <InvitePublicHeader />
      {children}
    </div>
  );
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/invitations/${token}`);
      setInvitation(data.invitation);
      setUserExists(data.user_exists);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired invitation";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError("");
    try {
      const data = await apiRequest(`/invitations/${token}`);
      const exists = Boolean(data?.user_exists);
      const inviteEmail = String(data?.invitation?.email || invitation?.email || "");
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      if (!exists) {
        if (origin) {
          window.location.assign(`${origin}/auth/signup?invitation=${encodeURIComponent(token)}`);
        } else {
          router.push(`/auth/signup?invitation=${encodeURIComponent(token)}`);
        }
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("pendingInvitation", token);
      }
      if (origin) {
        window.location.assign(
          `${origin}/auth/login?invitation=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteEmail)}`
        );
      } else {
        router.push(`/auth/login?invitation=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteEmail)}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process invitation";
      setError(message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <InvitePageShell>
        <GlobalPageLoader layout="page" message="Loading invitation…" ariaLabel="Loading invitation" />
      </InvitePageShell>
    );
  }

  if (error || !invitation) {
    return (
      <InvitePageShell>
        <main
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            background: "var(--color-canvas)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px clamp(16px, 4vw, 32px)",
            boxSizing: "border-box",
          }}
        >
          <BaseCard style={{ width: "100%", maxWidth: 440, padding: "clamp(24px, 4vw, 32px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.AlertCircle size={28} strokeWidth={2} style={{ color: "#ef4444" }} aria-hidden />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text)" }}>
                  Invalid invitation
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  {error || "This link may be expired or was revoked."}
                </p>
              </div>
              <button type="button" className="btn-primary focus-ring" style={{ marginTop: 8 }} onClick={() => router.push("/")}>
                Go to home
              </button>
            </div>
          </BaseCard>
        </main>
      </InvitePageShell>
    );
  }

  return (
    <InvitePageShell>
      <main
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          background: "var(--color-canvas)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(16px, 3vw, 32px) clamp(16px, 4vw, 32px) 32px",
          boxSizing: "border-box",
        }}
      >
        <BaseCard style={{ width: "100%", maxWidth: 520, padding: "clamp(24px, 4vw, 36px)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(var(--color-primary-rgb), 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Icons.Mail size={28} strokeWidth={2} style={{ color: "var(--color-primary)" }} aria-hidden />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text)" }}>You&apos;re invited</h1>
            <p style={{ margin: 0, fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 400 }}>
              <strong style={{ color: "var(--color-text)" }}>{invitation.inviter_name}</strong> invited you to join their workspace.
            </p>
          </div>

          <div
            style={{
              borderRadius: 10,
              border: "1px solid var(--elev-border, var(--color-border))",
              background: "var(--color-surface-secondary, rgba(0,0,0,0.04))",
              padding: 20,
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <div style={FIELD_LABEL}>Workspace</div>
              <div style={FIELD_VALUE}>{invitation.base_name}</div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Role</div>
              <div style={{ ...FIELD_VALUE, textTransform: "capitalize" }}>{invitation.role}</div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Email</div>
              <div style={FIELD_VALUE}>{invitation.email}</div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Expires</div>
              <div style={FIELD_VALUE}>
                {new Date(invitation.expires_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary focus-ring"
            style={{ width: "100%", padding: "14px 20px", fontSize: 16, fontWeight: 600 }}
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span className="global-page-loader-spinner" style={{ display: "inline-flex" }} aria-hidden>
                  <Icons.Loader size={22} strokeWidth={2} />
                </span>
                Processing…
              </span>
            ) : userExists ? (
              "Sign in to accept"
            ) : (
              "Sign up to accept"
            )}
          </button>

          {error ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>
          ) : null}

          <p style={{ margin: "20px 0 0", fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            {userExists
              ? "You’ll be redirected to sign in, then added to the workspace."
              : "You’ll be redirected to create your account, then added to the workspace."}
          </p>
        </BaseCard>
      </main>
    </InvitePageShell>
  );
}
