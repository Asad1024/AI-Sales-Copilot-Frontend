"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, getUser, setUser } from "@/lib/apiClient";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    "Founder / CEO",
    "Sales",
    "Business Development (BDR/SDR)",
    "Marketing",
    "Operations",
    "RevOps",
    "Customer Success",
    "Recruiting / HR",
    "Other"
  ];

  const timezones = [
    "UTC",
    "US/Eastern",
    "US/Pacific",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Tokyo"
  ];

  const complete = async () => {
    setError(null);
    setSaving(true);
    try {
      const profile = await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, company, role, timezone }),
      });

      if (profile?.user) {
        setUser(profile.user);
      } else {
        const existing = getUser();
        if (existing) {
          setUser({ ...existing, name: name || existing.name, company: company || existing.company });
        }
      }

      const basesResp = await apiRequest("/bases");
      const bases = Array.isArray(basesResp?.bases) ? basesResp.bases : [];
      if (!bases.length) {
        await apiRequest("/bases", {
          method: "POST",
          body: JSON.stringify({ name: company ? `${company} Base` : `${name || "My"} Base` }),
        });
      }

      localStorage.setItem("sparkai:profile_complete", "true");
      try {
        const userStr = localStorage.getItem("sparkai:user");
        const user = userStr && userStr !== "undefined" && userStr !== "null" ? JSON.parse(userStr) : {};
        localStorage.setItem("sparkai:user", JSON.stringify({ ...user, name, company, role, timezone }));
      } catch {}

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = step === 1 ? name.trim().length > 0 : role.length > 0;

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
        maxWidth: "480px"
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
            Welcome to Sales Co-Pilot
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Let's set up your account in a few steps
          </p>
        </div>

        {/* Progress */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "24px"
        }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                width: "80px",
                height: "4px",
                borderRadius: "2px",
                background: s <= step
                  ? "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)"
                  : "#e2e8f0",
                transition: "background 0.3s ease"
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0"
        }}>
          {error && (
            <div style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "20px",
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

          {step === 1 ? (
            <>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1e293b",
                  margin: "0 0 8px 0"
                }}>
                  Tell us about yourself
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                  We'll use this to personalize your experience.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    Company name
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
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

                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: !canProceed
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: !canProceed ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: !canProceed ? "none" : "0 4px 14px rgba(76, 103, 255, 0.4)",
                    marginTop: "8px"
                  }}
                >
                  Continue
                </button>
              </div>
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
                  Almost there!
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                  Just a couple more details to customize your workspace.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                    Your role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: role ? "#1e293b" : "#94a3b8",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#4C67FF"; e.target.style.boxShadow = "0 0 0 3px rgba(76,103,255,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  >
                    <option value="" disabled>Select your role</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#1e293b",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#4C67FF"; e.target.style.boxShadow = "0 0 0 3px rgba(76,103,255,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#475569",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={complete}
                    disabled={saving || !canProceed}
                    style={{
                      flex: 2,
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: saving || !canProceed
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #4C67FF 0%, #7C3AED 100%)",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: saving || !canProceed ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: saving || !canProceed ? "none" : "0 4px 14px rgba(76, 103, 255, 0.4)"
                    }}
                  >
                    {saving ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Setting up...
                      </span>
                    ) : "Get started"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          fontSize: "12px",
          color: "#94a3b8",
          marginTop: "24px"
        }}>
          You can always update these settings later
        </p>
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
