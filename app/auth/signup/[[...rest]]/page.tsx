"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { authAPI, apiRequest } from "@/lib/apiClient";
import { rememberTeamWorkspaceAfterInvite } from "@/lib/focusTeamWorkspace";
import { API_BASE } from "@/lib/api";
import GoogleSignInRedirecting from "@/components/auth/GoogleSignInRedirecting";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

function decodeGooglePendingJwt(token: string): { purpose?: string; name?: string; email?: string } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    base_name: string;
    /** Workspace owner’s profile company (API `owner_company`). */
    owner_company?: string;
    role: string;
  } | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationLoadError, setInvitationLoadError] = useState<string | null>(null);
  const pendingGoogleToken = searchParams.get("pending");
  const pendingTrim = pendingGoogleToken?.trim() ?? "";
  const invitationToken = searchParams.get("invitation")?.trim() ?? "";
  const googlePendingPayload = pendingTrim ? decodeGooglePendingJwt(pendingTrim) : null;
  /** Derived on each render so Google button + “or” never flash before effects run. */
  const isGoogleFinishFlow = Boolean(
    googlePendingPayload?.purpose === "google_oauth_pending" &&
      typeof googlePendingPayload?.email === "string"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const appTheme = localStorage.getItem("spark-theme");
      const landingTheme = localStorage.getItem("spark-landing-theme");
      const domTheme = document.documentElement.getAttribute("data-theme");
      const initialTheme =
        appTheme === "dark" || appTheme === "light"
          ? appTheme
          : landingTheme === "dark" || landingTheme === "light"
            ? landingTheme
            : domTheme === "dark"
              ? "dark"
              : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
      localStorage.setItem("spark-theme", initialTheme);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (pendingTrim) return;
    if (!invitationToken) {
      setInvitationDetails(null);
      setInvitationLoadError(null);
      setInvitationLoading(false);
      return;
    }
    let cancelled = false;
    setInvitationLoading(true);
    setInvitationLoadError(null);
    (async () => {
      try {
        const data = await apiRequest(`/invitations/${invitationToken}`);
        if (cancelled) return;
        const inv = data?.invitation;
        if (!inv?.email) {
          setInvitationDetails(null);
          setInvitationLoadError("Invalid invitation");
          return;
        }
        const normalized = String(inv.email).toLowerCase();
        const workspaceName = String(inv.base_name || "").trim();
        const ownerCompany = String(inv.owner_company || "").trim();
        setInvitationDetails({
          email: normalized,
          base_name: workspaceName,
          owner_company: ownerCompany || undefined,
          role: String(inv.role || ""),
        });
        setEmail(normalized);
        if (ownerCompany) {
          setCompany(ownerCompany);
        }
        setInvitationLoadError(null);
      } catch (e: any) {
        if (!cancelled) {
          setInvitationDetails(null);
          setInvitationLoadError(e?.message || "Invalid or expired invitation");
        }
      } finally {
        if (!cancelled) setInvitationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingTrim, invitationToken]);

  const isInvitationEmailLocked = Boolean(invitationDetails) && !pendingTrim;
  const suppressGoogleForWorkspaceInvite = Boolean(invitationToken) && !isGoogleFinishFlow;

  const startGoogleSignUp = () => {
    setError(null);
    setGoogleRedirecting(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.href = `${API_BASE}/api/auth/google`;
      });
    });
  };

  useEffect(() => {
    if (!pendingTrim) return;
    const payload = decodeGooglePendingJwt(pendingTrim);
    if (!payload || payload.purpose !== "google_oauth_pending" || typeof payload.email !== "string") {
      setError("This Google sign-up link is invalid or expired. Use “Continue with Google” again.");
      return;
    }
    setError(null);
    if (payload.name) setName(String(payload.name));
    setEmail(String(payload.email));
  }, [pendingTrim]);

  const onSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isGoogleFinishFlow && pendingTrim) {
        await authAPI.googleCompleteSignup({
          pending_token: pendingTrim,
          name: name.trim(),
          company: company.trim(),
          password: password.trim().length >= 6 ? password.trim() : undefined,
          ...(invitationToken ? { invitation_token: invitationToken } : {}),
        });
        router.replace("/auth/verify-required");
        return;
      }

      if (
        invitationDetails &&
        email.trim().toLowerCase() !== invitationDetails.email.toLowerCase()
      ) {
        throw new Error("Email must match the invitation.");
      }

      const signupRes = await authAPI.signup(
        email,
        password,
        name,
        company.trim(),
        undefined,
        invitationToken || undefined
      );

      if (invitationToken && typeof window !== "undefined") {
        const bid = signupRes?.base?.id;
        if (bid) rememberTeamWorkspaceAfterInvite(bid);
        sessionStorage.setItem(
          "invitationAccepted",
          JSON.stringify({
            baseName: signupRes.base?.name || invitationDetails?.base_name || "",
            baseId: bid,
            role: invitationDetails?.role || "member",
            message: "Welcome to the workspace",
          })
        );
        router.push("/auth/verify-required?invited=1");
        return;
      }

      router.push("/auth/verify-required");
    } catch (e: any) {
      setError(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const emailOk = Boolean(email.includes("@") && email.includes("."));
  const passwordOk = isGoogleFinishFlow ? password.length === 0 || password.length >= 6 : password.length >= 6;
  const confirmPasswordOk = isGoogleFinishFlow
    ? password.length === 0 || password === confirmPassword
    : password === confirmPassword && confirmPassword.length > 0;
  const invitationBlocksSubmit =
    Boolean(invitationToken) && (invitationLoading || Boolean(invitationLoadError) || !invitationDetails);
  const canSubmit = Boolean(
    name.trim() &&
      company.trim() &&
      emailOk &&
      passwordOk &&
      confirmPasswordOk &&
      !invitationBlocksSubmit
  );

  const requiredMark = <span style={{ color: "#dc2626", fontWeight: 600 }} aria-hidden>*</span>;
  const isDark = theme === "dark";

  return (
    <div
      className="auth-page"
      data-auth-theme={theme}
      style={{
      minHeight: "100vh",
      display: "flex",
      background: isDark ? "#050a16" : "#f8fafc",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.6s ease-in-out",
      position: "relative",
    }}
    >
      {googleRedirecting ? <GoogleSignInRedirecting /> : null}
      {/* Left Panel - Branding */}
      <div style={{
        flex: 1,
        background: isDark
          ? "linear-gradient(135deg, #0f172a 0%, #1f2937 48%, #14532d 100%)"
          : "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Animated decorative circles */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "50%",
          animation: mounted ? "float 8s ease-in-out infinite" : "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%",
          animation: mounted ? "float 10s ease-in-out infinite reverse" : "none"
        }} />
        
        {/* Floating particles */}
        {mounted && [1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${Math.random() * 6 + 4}px`,
              height: `${Math.random() * 6 + 4}px`,
              background: "rgba(255,255,255,0.3)",
              borderRadius: "50%",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particle${i} ${15 + Math.random() * 10}s linear infinite`,
              opacity: 0.6
            }}
          />
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: "480px" }}>
          {/* Logo */}
          <div style={{ marginBottom: "48px" }}>
            <Link href="/" aria-label="Go to landing page" style={{ display: "inline-block" }}>
              <AppBrandLogoLockup theme="dark" height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
            </Link>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "42px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1.15",
            letterSpacing: "-0.03em",
            margin: "0 0 20px 0"
          }}>
            Start closing deals in minutes, not months
          </h1>

          <p style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.85)",
            lineHeight: "1.7",
            margin: "0 0 40px 0"
          }}>
            Join thousands of sales teams using AI to find, enrich, and convert leads faster than ever before.
          </p>

          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            padding: "24px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            {[
              { value: "10x", label: "Faster Research" },
              { value: "85%", label: "Data Accuracy" },
              { value: "3x", label: "Reply Rate" }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#fff" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            marginTop: "32px",
            padding: "20px 24px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <p style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.9)",
              fontStyle: "italic",
              lineHeight: "1.6",
              margin: "0 0 12px 0"
            }}>
              "Rift Reach transformed how we approach outbound. We're booking 3x more meetings with half the effort."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "700"
              }}>
                SK
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Sarah K.</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Head of Sales, TechCorp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div
        className="auth-form-panel"
        style={{
        width: "520px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        background: isDark ? "#0b1220" : "#fff",
        position: "relative",
        transform: mounted ? "translateX(0)" : "translateX(50px)",
        transition: "transform 0.8s ease-out"
      }}
      >
        <div style={{ maxWidth: "360px", width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            {/* Progress indicator */}
            <div style={{ 
              display: "flex", 
              gap: "8px", 
              marginBottom: "24px",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-20px)",
              transition: "all 0.6s ease-out 0.2s"
            }}>
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    background: step === 1 ? "linear-gradient(90deg, var(--color-primary), #F29F67)" : isDark ? "#334155" : "#e2e8f0",
                    transition: "all 0.4s ease"
                  }}
                />
              ))}
            </div>

            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: isDark ? "#e2e8f0" : "#1e293b",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-10px)",
              transition: "all 0.6s ease-out 0.3s"
            }}>
              {isGoogleFinishFlow
                ? "Finish your registration"
                : isInvitationEmailLocked
                  ? "Accept your invite"
                  : "Create your account"}
            </h2>
            <p style={{ 
              fontSize: "14px", 
              color: isDark ? "#94a3b8" : "#64748b", 
              margin: 0,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.6s ease-out 0.4s"
            }}>
              {isGoogleFinishFlow
                ? "Google verified your email. Add any extra details, then create your account."
                : isInvitationEmailLocked
                  ? "Create your password below. The email on this invite cannot be changed."
                  : "Join thousands of sales teams | No credit card required"}
            </p>
          </div>

          {isGoogleFinishFlow && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #fbe0ce",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#de8850",
                lineHeight: 1.5,
              }}
            >
              Signed in with Google as <strong style={{ wordBreak: "break-all" }}>{email}</strong>. Password is optional if you only want to use Google.
            </div>
          )}

          {invitationToken && invitationLoading && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              Loading your invitation…
            </div>
          )}

          {invitationLoadError && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#b91c1c",
              }}
            >
              {invitationLoadError}
            </div>
          )}

          {isInvitationEmailLocked && invitationDetails && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #fbe0ce",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#de8850",
                lineHeight: 1.5,
              }}
            >
              You were invited to <strong>{invitationDetails.base_name || "a workspace"}</strong>
              {invitationDetails.role ? (
                <>
                  {" "}
                  as <strong style={{ textTransform: "capitalize" }}>{invitationDetails.role}</strong>
                </>
              ) : null}
              . Sign up with the email below (locked to this invite).
            </div>
          )}

          {/* Google Sign Up */}
          {!isGoogleFinishFlow && !suppressGoogleForWorkspaceInvite && (
          <button
            type="button"
            className="auth-google-btn"
            onClick={startGoogleSignUp}
            disabled={loading || googleRedirecting}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: "10px",
              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
              background: isDark ? "#0f172a" : "#fff",
              color: isDark ? "#e2e8f0" : "#1e293b",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading || googleRedirecting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)"
            }}
            onMouseOver={(e) => { 
              if (loading || googleRedirecting) return;
              e.currentTarget.style.background = isDark ? "#111f35" : "#f8fafc";
              e.currentTarget.style.borderColor = isDark ? "#475569" : "#cbd5e1";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = isDark ? "#0f172a" : "#fff";
              e.currentTarget.style.borderColor = isDark ? "#334155" : "#e2e8f0";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          )}

          {/* Divider */}
          {!isGoogleFinishFlow && !suppressGoogleForWorkspaceInvite && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "24px 0"
          }}>
            <div className="auth-divider-line" style={{ flex: 1, height: "1px", background: isDark ? "#334155" : "#e2e8f0" }} />
            <span className="auth-divider-text" style={{ fontSize: "12px", color: isDark ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>or</span>
            <div className="auth-divider-line" style={{ flex: 1, height: "1px", background: isDark ? "#334155" : "#e2e8f0" }} />
          </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Full name {requiredMark}
              </label>
              <input
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 14px",
                  borderRadius: "10px",
                  border: name.trim() ? "1px solid #10b981" : "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#1e293b",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = name.trim() ? "#10b981" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
              {name.trim() && (
                <div style={{
                  position: "absolute",
                  right: "14px",
                  top: "36px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "scaleIn 0.3s ease"
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Email {requiredMark}
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={isGoogleFinishFlow || isInvitationEmailLocked}
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 14px",
                  borderRadius: "10px",
                  border: email.includes('@') && email.includes('.') ? "1px solid #10b981" : "1px solid #e2e8f0",
                  background: isGoogleFinishFlow || isInvitationEmailLocked ? "#f1f5f9" : "#fff",
                  color: "#1e293b",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = email.includes('@') && email.includes('.') ? "#10b981" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
              {email.includes('@') && email.includes('.') && (
                <div style={{
                  position: "absolute",
                  right: "14px",
                  top: "36px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "scaleIn 0.3s ease"
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Company name {requiredMark}
              </label>
              {invitationDetails?.owner_company ? (
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  Prefilled from the workspace owner&apos;s company ({invitationDetails.owner_company}). You can edit if needed.
                </p>
              ) : null}
              <input
                type="text"
                placeholder="Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#1e293b",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Password{" "}
                {isGoogleFinishFlow ? (
                  <span style={{ color: "#94a3b8", fontWeight: "400" }}>(optional — min 6 if you want email login)</span>
                ) : (
                  requiredMark
                )}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isGoogleFinishFlow ? "Leave empty for Google-only" : "Min. 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) onSignup(); }}
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#1e293b",
                    fontSize: "14px",
                    outline: "none",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                  Password must be at least 6 characters
                </div>
              )}
            </div>

            <div style={{ marginTop: "2px", marginBottom: "2px" }}>
              <div style={{ height: "1px", background: "#e2e8f0", marginBottom: "12px" }} />
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Confirm password {requiredMark}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) onSignup(); }}
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#1e293b",
                    fontSize: "14px",
                    outline: "none",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                  Passwords do not match
                </div>
              )}
            </div>

            <button
              className="auth-primary-btn"
              onClick={onSignup}
              disabled={loading || !canSubmit}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: loading || !canSubmit
                  ? isDark
                    ? "#334155"
                    : "#cbd5e1"
                  : "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
                color: loading || !canSubmit
                  ? isDark
                    ? "#cbd5e1"
                    : "#fff"
                  : "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: loading || !canSubmit ? "none" : "0 4px 14px rgba(var(--color-primary-rgb), 0.2)",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseOver={(e) => {
                if (!loading && canSubmit) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(var(--color-primary-rgb), 0.2)";
                }
              }}
              onMouseOut={(e) => {
                if (!loading && canSubmit) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(var(--color-primary-rgb), 0.2)";
                }
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  Create account
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>

            <p style={{
              fontSize: "11px",
              color: isDark ? "#64748b" : "#94a3b8",
              textAlign: "center",
              marginTop: "4px",
              lineHeight: "1.5"
            }}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>

          {/* Sign in link */}
          <p style={{
            textAlign: "center",
            fontSize: "14px",
            color: isDark ? "#94a3b8" : "#64748b",
            marginTop: "28px"
          }}>
            Already have an account?{" "}
            <Link
              href={
                invitationToken
                  ? `/auth/login?invitation=${encodeURIComponent(invitationToken)}&email=${encodeURIComponent(
                      invitationDetails?.email || email
                    )}`
                  : "/auth/login"
              }
              style={{
                color: "var(--color-primary)",
                textDecoration: "none",
                fontWeight: "600"
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        .auth-page[data-auth-theme="dark"] .auth-form-panel a {
          color: #f5b78f !important;
        }
        .auth-page[data-auth-theme="dark"] .auth-form-panel label {
          color: #cbd5e1 !important;
        }
        .auth-page[data-auth-theme="dark"] .auth-form-panel input {
          background: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .auth-page[data-auth-theme="dark"] .auth-form-panel input::placeholder {
          color: #64748b !important;
        }
        .auth-page[data-auth-theme="dark"] .auth-form-panel input[readonly] {
          background: #111827 !important;
        }
        .auth-page[data-auth-theme="dark"] .auth-form-panel input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2) !important;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes particle1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(100px, -150px) scale(1.2); opacity: 0.3; }
          100% { transform: translate(200px, -50px) scale(0.8); opacity: 0; }
        }

        @keyframes particle2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(-120px, -100px) scale(0.8); opacity: 0.4; }
          100% { transform: translate(-200px, 100px) scale(1.3); opacity: 0; }
        }

        @keyframes particle3 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(80px, 120px) scale(1.4); opacity: 0.2; }
          100% { transform: translate(150px, 250px) scale(0.9); opacity: 0; }
        }

        @keyframes particle4 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          50% { transform: translate(-90px, 140px) scale(0.9); opacity: 0.35; }
          100% { transform: translate(-180px, 300px) scale(1.1); opacity: 0; }
        }

        @keyframes particle5 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(110px, -80px) scale(1.3); opacity: 0.3; }
          100% { transform: translate(220px, -180px) scale(0.7); opacity: 0; }
        }

        @keyframes particle6 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(-130px, -120px) scale(1.1); opacity: 0.25; }
          100% { transform: translate(-260px, -200px) scale(0.8); opacity: 0; }
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: opacity(0.5);
        }

        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          filter: opacity(1);
        }
      `}</style>
    </div>
  );
}
