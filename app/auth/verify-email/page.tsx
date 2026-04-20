"use client";

import { useEffect, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authAPI, getUser, setUser } from "@/lib/apiClient";
import { userNeedsOnboarding } from "@/lib/authRouting";
import { API_BASE } from "@/lib/api";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

function AuthShell({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
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
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <AppBrandLogoLockup height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
          </div>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>{subtitle ?? "Email verification"}</p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
            border: "1px solid #e2e8f0",
          }}
        >
          {children}
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Need help?{" "}
            <a href="mailto:support@riftreach.com" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
              Contact support
            </a>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes verifyEmailSpin {
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

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Invalid verification link. No token provided.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/verify-email/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Verification failed");
        if (cancelled) return;

        if (data.user) {
          const cur = getUser();
          if (cur) setUser({ ...cur, ...data.user, email_verified: true });
        }
        try {
          await authAPI.refresh();
        } catch {
          /* session optional */
        }

        router.replace(userNeedsOnboarding(getUser()) ? "/onboarding" : "/dashboard");
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Verification failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <AuthShell subtitle="Something went wrong">
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0", textAlign: "center" }}>
          Verification failed
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0", textAlign: "center", lineHeight: 1.5 }}>{error}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link
            href="/auth/verify-required"
            style={{
              display: "block",
              width: "100%",
              padding: "12px 20px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Back to verify page
          </Link>
          <Link
            href="/auth/login"
            style={{
              display: "block",
              width: "100%",
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Confirming your email">
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          style={{ animation: "verifyEmailSpin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0", textAlign: "center" }}>
        Verifying your email…
      </h2>
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
        Please wait while we confirm your address. You&apos;ll be redirected to onboarding or your dashboard.
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
