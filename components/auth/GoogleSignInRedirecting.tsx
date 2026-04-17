"use client";

/**
 * Full-screen state shown after the user chooses Google sign-in, before the browser
 * navigates to Google OAuth (same tab). Matches the app’s purple gradient brand.
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
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 48%, #06B6D4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 12px 40px rgba(37, 99, 235, 0.25)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
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
            borderTopColor: "#2563EB",
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
