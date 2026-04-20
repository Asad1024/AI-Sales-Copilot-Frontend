"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setToken, setUser, authAPI, getUser } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { routeAfterSuccessfulSession } from "@/lib/authRouting";
import OAuthCompletingScreen from "@/components/auth/OAuthCompletingScreen";
import { AuthCollapseBrandMark } from "@/components/auth/AuthCollapseBrandMark";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = params.get("token");

      if (!token) {
        setError("Missing token from Google sign-in.");
        return;
      }

      setToken(token);

      try {
        const refreshed = await authAPI.refresh();
        if (refreshed?.user) {
          setUser(refreshed.user);
        }

        const me = getUser();
        if (!me) {
          throw new Error("Session could not be established.");
        }

        if (me.email_verified === false) {
          router.replace("/auth/verify-required");
          return;
        }
        await useBaseStore.getState().refreshBases();
        await routeAfterSuccessfulSession(router, null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to complete Google sign-in.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <AuthCollapseBrandMark marginBottom={20} />
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#0f172a",
              margin: "0 0 8px 0",
            }}
          >
            Couldn’t sign you in
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              margin: "0 0 24px 0",
              lineHeight: 1.55,
            }}
          >
            {error}
          </p>
          <Link
            href="/auth/login"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, #F29F67 100%)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(var(--color-primary-rgb), 0.2)",
            }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return <OAuthCompletingScreen />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCompletingScreen />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
