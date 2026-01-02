"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setToken, setUser, apiRequest } from "@/lib/apiClient";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = params.get("token");
      const next = params.get("next");
      const created = params.get("created") === "true";

      if (!token) {
        setError("Missing token from Google sign-in.");
        return;
      }

      setToken(token);

      try {
        const refreshed = await apiRequest("/auth/refresh");
        if (refreshed?.user) {
          setUser(refreshed.user);
        }

        // Only new users (created=true) need onboarding
        // Existing users signing in via Google go straight to dashboard
        if (created) {
          localStorage.setItem("sparkai:profile_complete", "false");
          router.replace("/onboarding");
        } else {
          // Existing user - mark as complete and go to dashboard
          localStorage.setItem("sparkai:profile_complete", "true");
          router.replace(next || "/dashboard");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to complete Google sign-in.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(76, 103, 255, 0.3)"
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#1e293b",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em"
          }}>
            Sales Co-Pilot
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0"
        }}>
          {error ? (
            <>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgba(239, 68, 68, 0.3)"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>

              <h2 style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#1e293b",
                margin: "0 0 8px 0",
                textAlign: "center"
              }}>
                Sign-in failed
              </h2>
              <p style={{
                fontSize: "14px",
                color: "#64748b",
                margin: "0 0 20px 0",
                textAlign: "center",
                lineHeight: "1.5"
              }}>
                {error}
              </p>

              <Link
                href="/auth/login"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(76, 103, 255, 0.4)"
                }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
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
                margin: "0 0 8px 0",
                textAlign: "center"
              }}>
                Completing sign-in
              </h2>
              <p style={{
                fontSize: "14px",
                color: "#64748b",
                margin: 0,
                textAlign: "center",
                lineHeight: "1.5"
              }}>
                Please wait while we set up your session...
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(76, 103, 255, 0.4); }
          50% { box-shadow: 0 0 0 16px rgba(76, 103, 255, 0); }
        }
      `}</style>
    </div>
  );
}

export default function OAuthCallbackPage() {
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
            background: "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
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
      <OAuthCallbackContent />
    </Suspense>
  );
}
