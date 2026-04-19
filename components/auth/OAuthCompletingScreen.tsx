"use client";

import { AuthCollapseBrandMark } from "@/components/auth/AuthCollapseBrandMark";

/** Minimal full-screen loader while /auth/oauth-callback exchanges the Google token. */
export default function OAuthCompletingScreen() {
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
      <div style={{ textAlign: "center", maxWidth: "360px" }}>
        <AuthCollapseBrandMark />
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#0f172a",
            margin: "0 0 10px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Signing in…
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px 0", lineHeight: 1.55 }}>
          Securing your session. One moment.
        </p>
        <div
          style={{
            width: "36px",
            height: "36px",
            margin: "0 auto",
            borderRadius: "50%",
            border: "3px solid #e2e8f0",
            borderTopColor: "#2563EB",
            animation: "oauthCompletingSpin 0.75s linear infinite",
          }}
        />
      </div>
      <style jsx global>{`
        @keyframes oauthCompletingSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
