"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authAPI } from "@/lib/apiClient";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const canSubmit = token && password.length >= 6 && password === confirm;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to reset password.");
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
      background: "#f8fafc",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <AppBrandLogoLockup height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
          </div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#1e293b",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em"
          }}>
            Set your new password
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Choose a strong password for your account.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0"
        }}>
          {!token ? (
            <>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgba(245, 158, 11, 0.3)"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>

              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#1e293b",
                margin: "0 0 8px 0",
                textAlign: "center"
              }}>
                Invalid reset link
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", textAlign: "center", lineHeight: "1.5" }}>
                This reset link is missing or has expired. Please request a new one.
              </p>

              <Link
                href="/auth/forgot-password"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 48%, #06B6D4 100%)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)"
                }}
              >
                Request new link
              </Link>
            </>
          ) : done ? (
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
                color: "#1e293b",
                margin: "0 0 8px 0",
                textAlign: "center"
              }}>
                Password updated!
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, textAlign: "center", lineHeight: "1.5" }}>
                Redirecting you to sign in...
              </p>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1e293b",
                  margin: "0 0 8px 0"
                }}>
                  Create new password
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                  Your new password must be at least 6 characters long.
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

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                    New password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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
                      onFocus={(e) => { e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235,0.1)"; }}
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

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                    Confirm password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) onSubmit(); }}
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
                      onFocus={(e) => { e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235,0.1)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
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
                      {showConfirm ? (
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
                  {confirm.length > 0 && password !== confirm && (
                    <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                <button
                  onClick={onSubmit}
                  disabled={loading || !canSubmit}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: loading || !canSubmit
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 48%, #06B6D4 100%)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: loading || !canSubmit ? "none" : "0 4px 14px rgba(37, 99, 235, 0.4)"
                  }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Updating...
                    </span>
                  ) : "Reset password"}
                </button>
              </div>
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
              color: "#64748b",
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "20px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          textAlign: "center"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 48%, #06B6D4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            animation: "pulse 2s ease-in-out infinite"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#1e293b",
            margin: "0 0 8px 0"
          }}>
            Loading...
          </h2>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
