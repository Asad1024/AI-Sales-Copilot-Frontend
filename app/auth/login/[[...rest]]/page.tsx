"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { authAPI, isAuthenticated } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { API_BASE } from "@/lib/api";
import { routeAfterSuccessfulSession } from "@/lib/authRouting";
import GoogleSignInRedirecting from "@/components/auth/GoogleSignInRedirecting";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const invitationTokenLogin = searchParams.get("invitation")?.trim() ?? "";
  const inviteEmailFromQuery = searchParams.get("email")?.trim() ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const em = searchParams.get("email")?.trim();
    if (em) setEmail(em);
  }, [searchParams]);

  const isInviteLoginEmailLocked = Boolean(invitationTokenLogin && inviteEmailFromQuery);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    let cancelled = false;
    (async () => {
      try {
        await authAPI.refresh();
        if (cancelled) return;
        await routeAfterSuccessfulSession(router, searchParams);
      } catch {
        /* stale token */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, router, searchParams]);

  const startGoogleSignIn = () => {
    setError(null);
    setGoogleRedirecting(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.href = `${API_BASE}/api/auth/google`;
      });
    });
  };

  const onLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await authAPI.login(email, password);
      await useBaseStore.getState().refreshBases();
      await routeAfterSuccessfulSession(router, searchParams);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#f8fafc",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.6s ease-in-out",
      position: "relative",
    }}>
      {googleRedirecting ? <GoogleSignInRedirecting /> : null}
      {/* Left Panel - Branding */}
      <div style={{
        flex: 1,
        background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
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
            Close more deals with intelligent automation
          </h1>

          <p style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.85)",
            lineHeight: "1.7",
            margin: "0 0 40px 0"
          }}>
            Enrich leads, score prospects, and launch multi-channel campaigns — all powered by AI that learns your ideal customer.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { title: "Smart Lead Scoring", desc: "AI analyzes data quality & engagement" },
              { title: "Multi-Channel Outreach", desc: "Email, LinkedIn, WhatsApp in one flow" },
              { title: "Real-Time Enrichment", desc: "Auto-fill missing contact info" }
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                padding: "16px 18px",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12"/>
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

      {/* Right Panel - Login Form */}
      <div style={{
        width: "520px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        background: "#fff",
        transform: mounted ? "translateX(0)" : "translateX(50px)",
        transition: "transform 0.8s ease-out"
      }}>
        <div style={{ maxWidth: "360px", width: "100%", margin: "0 auto" }}>
          {/* Success indicator animation */}
          <div style={{ 
            marginBottom: "32px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "scale(1)" : "scale(0.9)",
            transition: "all 0.6s ease-out 0.2s"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 10px 40px rgba(124, 58, 237, 0.3)"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em"
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              Sign in to continue closing deals
            </p>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={startGoogleSignIn}
            disabled={loading || googleRedirecting}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#1e293b",
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
              e.currentTarget.style.background = "#f8fafc"; 
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = "#fff"; 
              e.currentTarget.style.borderColor = "#e2e8f0";
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
                Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={isInviteLoginEmailLocked}
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: isInviteLoginEmailLocked ? "#f1f5f9" : "#fff",
                  color: "#1e293b",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; e.target.style.boxShadow = "0 0 0 3px rgba(124, 58, 237,0.1)"; }}
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === "Enter" && email && password) onLogin(); }}
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
                  onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; e.target.style.boxShadow = "0 0 0 3px rgba(124, 58, 237,0.1)"; }}
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
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-8px" }}>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: "13px",
                  color: "#7C3AED",
                  textDecoration: "none",
                  fontWeight: "500"
                }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              onClick={onLogin}
              disabled={loading || !email || !password}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: loading || !email || !password
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #6D28D9 0%, #7C3AED 48%, #A94CFF 100%)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: loading || !email || !password ? "none" : "0 4px 14px rgba(124, 58, 237, 0.4)",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseOver={(e) => {
                if (!loading && email && password) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124, 58, 237, 0.5)";
                }
              }}
              onMouseOut={(e) => {
                if (!loading && email && password) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(124, 58, 237, 0.4)";
                }
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  Sign in
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>
          </div>

          {/* Sign up link */}
          <p style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#64748b",
            marginTop: "28px"
          }}>
            {"Don't have an account? "}
            <Link
              href={
                invitationTokenLogin
                  ? `/auth/signup?invitation=${encodeURIComponent(invitationTokenLogin)}`
                  : "/auth/signup"
              }
              style={{
                color: "#7C3AED",
                textDecoration: "none",
                fontWeight: "600"
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
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
      `}</style>
    </div>
  );
}
