"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authAPI } from "@/lib/apiClient";
import { API_BASE } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      await authAPI.signup(email, password, name);
      localStorage.setItem("sparkai:profile_complete", "false");
      router.push("/onboarding");
    } catch (e: any) {
      setError(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim() && email && password.length >= 6;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#f8fafc"
    }}>
      {/* Left Panel - Branding */}
      <div style={{
        flex: 1,
        background: "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "50%"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%"
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "480px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "#fff", letterSpacing: "-0.02em" }}>
                Sales Co-Pilot
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>
                AI-Powered Sales Automation
              </div>
            </div>
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
              "Sales Co-Pilot transformed how we approach outbound. We're booking 3x more meetings with half the effort."
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
      <div style={{
        width: "520px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        background: "#fff"
      }}>
        <div style={{ maxWidth: "360px", width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em"
            }}>
              Create your account
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              Free to start • No credit card required
            </p>
          </div>

          {/* Google Sign Up */}
          <button
            onClick={() => { window.location.href = `${API_BASE}/auth/google`; }}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#1e293b",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "24px 0"
          }}>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          </div>

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
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Full name
              </label>
              <input
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
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
                onFocus={(e) => { e.target.style.borderColor = "#4C67FF"; e.target.style.boxShadow = "0 0 0 3px rgba(76,103,255,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Work email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                onFocus={(e) => { e.target.style.borderColor = "#4C67FF"; e.target.style.boxShadow = "0 0 0 3px rgba(76,103,255,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
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
                  onFocus={(e) => { e.target.style.borderColor = "#4C67FF"; e.target.style.boxShadow = "0 0 0 3px rgba(76,103,255,0.1)"; }}
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

            <button
              onClick={onSignup}
              disabled={loading || !canSubmit}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: loading || !canSubmit
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                boxShadow: loading || !canSubmit ? "none" : "0 4px 14px rgba(76, 103, 255, 0.4)"
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Creating account...
                </span>
              ) : "Create account"}
            </button>

            <p style={{
              fontSize: "11px",
              color: "#94a3b8",
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
            color: "#64748b",
            marginTop: "28px"
          }}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              style={{
                color: "#4C67FF",
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
