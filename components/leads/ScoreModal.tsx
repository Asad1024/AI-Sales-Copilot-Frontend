"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

interface ScoreModalProps {
  open: boolean;
  onClose: () => void;
  onScored?: () => void;
}

export function ScoreModal({ open, onClose, onScored }: ScoreModalProps) {
  const { activeBaseId } = useBaseStore();
  const { selectedLeads, leads } = useLeadStore();
  const { showSuccess, showError, showWarning } = useNotification();

  const [purpose, setPurpose] = useState("");
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState("");
  const [scoreScope, setScoreScope] = useState<"selected" | "all">("selected");

  if (!open) return null;

  const chipActive = (on: boolean) =>
    ({
      flex: 1,
      padding: "11px 14px",
      borderRadius: 10,
      border: on ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
      background: on ? "rgba(76, 103, 255, 0.1)" : "var(--color-surface-secondary)",
      color: "var(--color-text)",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      transition: "border-color 0.15s ease, background 0.15s ease",
    }) as const;

  const handleScore = async () => {
    if (!activeBaseId) {
      showError("Something went wrong", "Choose a workspace and try again.");
      return;
    }

    const leadsToScore = scoreScope === "selected" ? selectedLeads : leads.map(l => l.id);

    if (leadsToScore.length === 0) {
      showError(
        "No leads to score",
        scoreScope === "selected"
          ? "Select one or more rows, or choose “All leads”."
          : "There are no leads in this list yet."
      );
      return;
    }

    setScoring(true);
    setProgress("Starting…");

    try {
      let successCount = 0;
      let errorCount = 0;
      const total = leadsToScore.length;

      for (let i = 0; i < leadsToScore.length; i++) {
        const leadId = leadsToScore[i];
        setProgress(`Scoring lead ${i + 1} of ${total}…`);

        try {
          await apiRequest(`/leads/${leadId}`, {
            method: "PUT",
            body: JSON.stringify({
              score: true,
              purpose: purpose.trim() || undefined,
            }),
          });
          successCount++;
        } catch (error: unknown) {
          console.error(`Failed to score lead ${leadId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setProgress(`Done — scored ${successCount} lead(s).`);
        if (errorCount > 0) {
          showWarning(
            "Finished with a few issues",
            `${successCount} scored successfully; ${errorCount} couldn’t be updated.`
          );
        } else {
          showSuccess("Scores updated", `Successfully scored ${successCount} lead(s).`);
        }

        setTimeout(() => {
          setScoring(false);
          setProgress("");
          setPurpose("");
          onScored?.();
          onClose();
        }, 1500);
      } else {
        throw new Error("No leads were scored");
      }
    } catch (error: unknown) {
      console.error("Scoring error:", error);
      const message =
        error instanceof Error ? error.message : "Couldn’t score leads. Please try again.";
      showError("Scoring didn’t finish", message);
      setProgress("");
      setScoring(false);
    }
  };

  const canSubmit =
    scoreScope === "all" ? leads.length > 0 : selectedLeads.length > 0;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scoreModalIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scorePanelIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes scoreSpin { to { transform: rotate(360deg); } }
      `,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          animation: "scoreModalIn 0.2s ease-out",
        }}
        onClick={onClose}
        role="presentation"
      >
        <div
          style={{
            width: "min(520px, 96vw)",
            maxHeight: "90vh",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            boxShadow: "0 24px 64px var(--color-shadow)",
            animation: "scorePanelIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-modal-title"
        >
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(76, 103, 255, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.Target size={20} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  id="score-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Score leads
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  Run AI scoring on your list using optional context
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                padding: 0,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
            {scoring ? (
              <div style={{ textAlign: "center", padding: "36px 16px 28px" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    margin: "0 auto 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.Loader
                    size={40}
                    strokeWidth={1.5}
                    style={{ color: "var(--color-primary)", animation: "scoreSpin 0.85s linear infinite" }}
                  />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                  {progress || "Scoring your leads…"}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
                  This can take a moment for longer lists. You can leave this dialog open until it finishes.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Who to score
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setScoreScope("selected")}
                      disabled={selectedLeads.length === 0}
                      style={{
                        ...chipActive(scoreScope === "selected"),
                        opacity: selectedLeads.length === 0 ? 0.5 : 1,
                        cursor: selectedLeads.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button type="button" onClick={() => setScoreScope("all")} style={chipActive(scoreScope === "all")}>
                      All ({leads.length})
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Context (optional)
                  </label>
                  <textarea
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Prioritize SaaS founders in fintech who recently raised"
                    style={{
                      width: "100%",
                      minHeight: 76,
                      padding: "11px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-secondary)",
                      color: "var(--color-text)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                    Helps the model align scores with what you’re trying to accomplish.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleScore}
                    disabled={scoring || !canSubmit}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 600,
                      background: "var(--color-primary)",
                      border: "none",
                      opacity: !canSubmit ? 0.45 : 1,
                      cursor: !canSubmit ? "not-allowed" : "pointer",
                      boxShadow: !canSubmit ? "none" : "0 8px 22px rgba(76, 103, 255, 0.28)",
                    }}
                  >
                    Score{" "}
                    {scoreScope === "selected" ? selectedLeads.length : leads.length} lead(s)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
