"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authAPI } from "@/lib/apiClient";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

export default function ForgotPasswordPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const appTheme = localStorage.getItem("spark-theme");
      const landingTheme = localStorage.getItem("spark-landing-theme");
      const domTheme = document.documentElement.getAttribute("data-theme");
      const resolvedTheme =
        appTheme === "dark" || appTheme === "light"
          ? appTheme
          : landingTheme === "dark" || landingTheme === "light"
            ? landingTheme
            : domTheme === "dark"
              ? "dark"
              : "light";
      setTheme(resolvedTheme);
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      localStorage.setItem("spark-theme", resolvedTheme);
    } catch {
      /* ignore */
    }
  }, []);

  const isDark = theme === "dark";

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    setSent(false);
    setDevResetUrl(null);
    try {
      const resp = await authAPI.requestPasswordReset(email);
      setSent(true);
      if (resp?.reset_url) setDevResetUrl(resp.reset_url);
    } catch (e: any) {
      setError(e?.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: isDark
        ? "radial-gradient(circle at top, #0d1527 0%, #050508 48%, #030306 100%)"
        : "#f8fafc",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <AppBrandLogoLockup theme={theme} height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
          </div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: "700",
            color: isDark ? "#e2e8f0" : "#1e293b",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em"
          }}>
            Reset your password
          </h1>
          <p style={{ fontSize: "14px", color: isDark ? "#94a3b8" : "#64748b", margin: 0 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: isDark ? "#0b1220" : "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: isDark ? "0 4px 24px rgba(2,6,23,0.45)" : "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0"
        }}>
          {!sent ? (
            <>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: isDark ? "#e2e8f0" : "#1e293b",
                  margin: "0 0 8px 0"
                }}>
                  Forgot your password?
                </h2>
                <p style={{ fontSize: "14px", color: isDark ? "#94a3b8" : "#64748b", margin: 0, lineHeight: "1.5" }}>
                  No worries! Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

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

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: isDark ? "#cbd5e1" : "#475569", marginBottom: "6px" }}>
                  Email address
                </label>
                <input
                  className="forgot-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  onKeyDown={(e) => { if (e.key === "Enter" && email) onSubmit(); }}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                    background: isDark ? "#0f172a" : "#fff",
                    color: isDark ? "#e2e8f0" : "#1e293b",
                    fontSize: "14px",
                    outline: "none",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.2)"; }}
                  onBlur={(e) => { e.target.style.borderColor = isDark ? "#334155" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <button
                onClick={onSubmit}
                disabled={loading || !email}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: loading || !email
                    ? isDark
                      ? "#334155"
                      : "#cbd5e1"
                    : "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
                  color: loading || !email
                    ? isDark
                      ? "#cbd5e1"
                      : "#fff"
                    : "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: loading || !email ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: loading || !email ? "none" : "0 4px 14px rgba(var(--color-primary-rgb), 0.2)"
                }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Sending...
                  </span>
                ) : "Send reset link"}
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>

              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                color: isDark ? "#e2e8f0" : "#1e293b",
                margin: "0 0 8px 0",
                textAlign: "center"
              }}>
                Check your email
              </h2>
              <p style={{ fontSize: "14px", color: isDark ? "#94a3b8" : "#64748b", margin: "0 0 20px 0", textAlign: "center", lineHeight: "1.5" }}>
                We sent a password reset link to<br />
                <span style={{ fontWeight: "600", color: isDark ? "#e2e8f0" : "#1e293b" }}>{email}</span>
              </p>

              {devResetUrl && (
                <div style={{
                  padding: "14px",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontSize: "12px", color: "#15803d", marginBottom: "8px", fontWeight: "500" }}>
                    Dev mode: Email not configured
                  </div>
                  <a
                    href={devResetUrl}
                    style={{
                      color: "var(--color-primary)",
                      textDecoration: "none",
                      fontWeight: "600",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    Open reset link
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                  </a>
                </div>
              )}

              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                  background: isDark ? "#0f172a" : "#fff",
                  color: isDark ? "#cbd5e1" : "#475569",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Try another email
              </button>
            </>
          )}
        </div>

        {/* Back to login */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link
            href="/auth/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: isDark ? "#94a3b8" : "#64748b",
              textDecoration: "none",
              fontWeight: "500",
              transition: "color 0.2s ease"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to sign in
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .forgot-input::placeholder {
          color: ${isDark ? "#64748b" : "#94a3b8"};
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
