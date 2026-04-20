"use client";

import { AuthCollapseBrandMark } from "@/components/auth/AuthCollapseBrandMark";

/**
 * Full-screen state shown after the user chooses Google sign-in, before the browser
 * navigates to Google OAuth (same tab). Uses `collapse_logo.png` like the collapsed sidebar.
 */
export default function GoogleSignInRedirecting() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
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
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0 0 28px 0",
            lineHeight: 1.55,
          }}
        >
          Redirecting you to Google. You’ll return here to finish signing in.
        </p>
        <div
          style={{
            width: "36px",
            height: "36px",
            margin: "0 auto",
            borderRadius: "50%",
            border: "3px solid #e2e8f0",
            borderTopColor: "var(--color-primary)",
            animation: "googleSignInSpin 0.75s linear infinite",
          }}
        />
      </div>
      <style jsx global>{`
        @keyframes googleSignInSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
