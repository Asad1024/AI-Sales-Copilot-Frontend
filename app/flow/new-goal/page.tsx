"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Wand2 } from "lucide-react";
import { createAIPlan } from "@/lib/flowClient";
import { useNotification } from "@/context/NotificationContext";

const examples = [
  "Reactivate 500 old leads from CRM and send WhatsApp first.",
  "Promote AI webinar to founders in MENA via email + LinkedIn.",
  "Sell SaaS to EU marketing directors with email + WhatsApp bump.",
];

const shell: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const card: CSSProperties = {
  background: "var(--color-surface, #ffffff)",
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 40px rgba(79, 70, 229, 0.06)",
  padding: "28px 28px 24px",
  position: "relative",
  overflow: "hidden",
};

export default function NewGoalPage() {
  const { showError } = useNotification();
  const [goal, setGoal] = useState("Get 30 demos with UAE real estate founders in 30 days.");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createAIPlan(goal);
      sessionStorage.setItem("sparkai:plan", JSON.stringify(data));
      router.push("/flow/plan");
    } catch (error) {
      console.error("Failed to create AI plan:", error);
      showError("Plan creation failed", "Failed to create AI plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-new-goal-page">
      <div style={shell}>
        <header style={{ textAlign: "left" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 9999,
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            marginBottom: 14,
          }}
        >
          <Sparkles size={15} strokeWidth={2} color="#4f46e5" aria-hidden />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#4338ca", letterSpacing: "0.02em" }}>AI outreach flow</span>
        </div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
            fontWeight: 800,
            margin: "0 0 10px 0",
            letterSpacing: "-0.03em",
            color: "var(--color-text, #0f172a)",
            fontFamily: "Inter, -apple-system, sans-serif",
          }}
        >
          Set your growth goal
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted, #64748b)", margin: 0, lineHeight: 1.55, maxWidth: 520 }}>
          Describe what you want to achieve. We will draft audience, channels, and safety guardrails you can review on the next
          step.
        </p>
        </header>

        <form onSubmit={handleSubmit} style={card}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
          }}
        />

        <label
          htmlFor="flow-new-goal"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 10,
            color: "#334155",
          }}
        >
          What do you want to achieve?
        </label>
        <textarea
          id="flow-new-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          placeholder="Example: Book 50 calls with HR managers in Dubai in two weeks."
          style={{
            width: "100%",
            minHeight: 120,
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            color: "var(--color-text, #0f172a)",
            fontSize: 14,
            lineHeight: 1.5,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#a5b4fc";
            e.target.style.background = "#fff";
            e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.background = "#f8fafc";
            e.target.style.boxShadow = "none";
          }}
        />

        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Try an example
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {examples.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setGoal(text)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#334155",
                  fontSize: 13,
                  lineHeight: 1.45,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s ease, background 0.15s ease, transform 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c7d2fe";
                  e.currentTarget.style.background = "#f5f3ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={loading || !goal.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 10,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: loading || !goal.trim() ? "not-allowed" : "pointer",
              background: loading || !goal.trim() ? "#e2e8f0" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: loading || !goal.trim() ? "#94a3b8" : "#fff",
              boxShadow: loading || !goal.trim() ? "none" : "0 4px 14px rgba(79, 70, 229, 0.35)",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "flowGoalSpin 0.85s linear infinite",
                  }}
                  aria-hidden
                />
                Building plan…
              </>
            ) : (
              <>
                <Wand2 size={17} strokeWidth={2} aria-hidden />
                Generate plan
                <ArrowRight size={17} strokeWidth={2} aria-hidden />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
        </form>
      </div>

      <style jsx>{`
        .flow-new-goal-page {
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          padding: clamp(18px, 4vh, 32px) 16px clamp(28px, 6vh, 48px);
        }
        @keyframes flowGoalSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
