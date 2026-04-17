"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { Zap, PlayCircle, ChevronRight, ChevronLeft, ArrowUpRight, Lock } from "lucide-react";
import { getSetupStepVisualStates } from "@/components/ui/dashboardSetupProgressUtils";

type StepStatus = "complete" | "current" | "upcoming";

const DOT = 30;
const RING = 3;
const RING_PAD = 4;
const FONT = 13;
const CHECK = 15;
const LABEL = 11;
const GAP = 4;

function StepDot({ status, label, stepNumber }: { status: StepStatus; label: string; stepNumber: 1 | 2 | 3 }) {
  const isComplete = status === "complete";
  const isCurrent = status === "current";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: GAP,
        minWidth: 72,
        flex: "0 0 auto",
        maxWidth: "none",
        overflow: "visible",
      }}
    >
      <div
        style={{
          padding: RING_PAD,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <div
          aria-hidden
          style={{
            width: DOT,
            height: DOT,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: FONT,
            fontWeight: 700,
            boxSizing: "border-box",
            border: isComplete
              ? "none"
              : isCurrent
                ? `${RING}px solid var(--color-primary, #2563EB)`
                : "1px solid #E5E7EB",
            background: isComplete ? "#059669" : isCurrent ? "rgba(37, 99, 235, 0.08)" : "#F9FAFB",
            color: isComplete ? "#FFFFFF" : isCurrent ? "var(--color-primary, #2563EB)" : "#9CA3AF",
            boxShadow: isCurrent ? "0 0 0 4px rgba(37, 99, 235, 0.2)" : "none",
          }}
        >
          {isComplete ? (
            <Icons.Check size={CHECK} strokeWidth={2.5} />
          ) : status === "upcoming" ? (
            <Lock size={14} strokeWidth={2.25} color="#9CA3AF" aria-hidden />
          ) : (
            stepNumber
          )}
        </div>
      </div>
      <span
        style={{
          fontSize: LABEL,
          fontWeight: isCurrent ? 600 : 500,
          color: isCurrent ? "#111827" : isComplete ? "#374151" : "#9CA3AF",
          textAlign: "center",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  const lineH = 2;
  const marginTop = RING_PAD + DOT / 2 - lineH / 2;

  return (
    <div
      aria-hidden
      style={{
        flex: "1 1 32px",
        height: lineH,
        alignSelf: "flex-start",
        marginTop,
        borderRadius: 2,
        background: done ? "#059669" : "#E5E7EB",
        minWidth: 24,
        maxWidth: "none",
      }}
    />
  );
}

export type DashboardOnboardingSteppersProps = {
  activeBaseId: number | null;
  hasLeads: boolean;
  hasCampaigns: boolean;
  onGoWorkspace: () => void;
  onGoLeads: () => void;
  onGoCampaign: () => void;
};

/**
 * Setup path workspace → leads → campaign, plus optional Spark / learn column.
 */
export default function DashboardOnboardingSteppers({
  activeBaseId,
  hasLeads,
  hasCampaigns,
  onGoWorkspace,
  onGoLeads,
  onGoCampaign,
}: DashboardOnboardingSteppersProps) {
  const router = useRouter();

  const v = getSetupStepVisualStates(activeBaseId, hasLeads, hasCampaigns);
  const toDot = (s: "complete" | "current" | "locked"): StepStatus =>
    s === "complete" ? "complete" : s === "current" ? "current" : "upcoming";
  const workspaceStatus: StepStatus = toDot(v.workspace);
  const leadsStatus: StepStatus = toDot(v.leads);
  const campaignStatus: StepStatus = toDot(v.campaign);

  const [demoCardOpen, setDemoCardOpen] = useState(false);

  const sectionTitle = {
    fontSize: 10,
    fontWeight: 500 as const,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#9CA3AF",
    marginBottom: 0,
  };

  const cardShell = {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "10px 12px 12px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
    overflow: "visible" as const,
  };

  return (
    <div
      className="dashboard-stepper-row"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 12,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div className="dashboard-surface-card dashboard-stepper-main-card" style={{ ...cardShell, flex: "1 1 0", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <div style={sectionTitle}>Getting started</div>
          <button
            type="button"
            className="dashboard-demo-toggle-badge"
            data-open={demoCardOpen ? "true" : "false"}
            aria-expanded={demoCardOpen}
            aria-controls="dashboard-spark-learn-card"
            onClick={() => setDemoCardOpen((v) => !v)}
            title={demoCardOpen ? "Hide demo shortcuts" : "Show demo and learning shortcuts"}
            style={{
              borderRadius: 9999,
              height: 30,
              minHeight: 30,
              boxSizing: "border-box",
            }}
          >
            {demoCardOpen ? (
              <>
                Hide
                <ChevronLeft size={14} strokeWidth={2.25} aria-hidden />
              </>
            ) : (
              <>
                Demo
                <ChevronRight size={14} strokeWidth={2.25} aria-hidden />
              </>
            )}
          </button>
        </div>
        <div
          aria-label="Setup progress: workspace, leads, campaign"
          className="dashboard-stepper-track"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 0,
            width: "100%",
            flexWrap: "wrap",
            rowGap: 6,
            minWidth: 0,
            overflow: "visible",
            paddingTop: 2,
            paddingBottom: 3,
          }}
        >
          <button
            type="button"
            onClick={onGoWorkspace}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
              textAlign: "inherit",
              flex: "0 0 auto",
            }}
          >
            <StepDot status={workspaceStatus} label="Workspace" stepNumber={1} />
          </button>
          <Connector done={Boolean(activeBaseId)} />
          <button
            type="button"
            onClick={onGoLeads}
            disabled={!activeBaseId}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: activeBaseId ? "pointer" : "not-allowed",
              font: "inherit",
              textAlign: "inherit",
              opacity: activeBaseId ? 1 : 0.85,
              flex: "0 0 auto",
            }}
          >
            <StepDot status={leadsStatus} label="Add leads" stepNumber={2} />
          </button>
          <Connector done={Boolean(activeBaseId && hasLeads)} />
          <button
            type="button"
            onClick={onGoCampaign}
            disabled={!activeBaseId || !hasLeads}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: activeBaseId && hasLeads ? "pointer" : "not-allowed",
              font: "inherit",
              textAlign: "inherit",
              opacity: activeBaseId && hasLeads ? 1 : 0.85,
              flex: "0 0 auto",
            }}
          >
            <StepDot status={campaignStatus} label="Campaign" stepNumber={3} />
          </button>
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 11,
            color: "#6B7280",
            lineHeight: 1.45,
            textAlign: "center",
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {!activeBaseId && "Create or select a workspace first, then add leads before launching a campaign."}
          {activeBaseId && !hasLeads && "Import or add leads to this workspace so your campaigns have recipients."}
          {activeBaseId && hasLeads && !hasCampaigns && "You are set — create a campaign to start outreach."}
          {activeBaseId && hasLeads && hasCampaigns && "Setup complete. Create more campaigns or refine existing ones anytime."}
        </p>
      </div>

      <div
        className="dashboard-spark-demo-column"
        data-demo-open={demoCardOpen ? "true" : "false"}
        aria-hidden={!demoCardOpen}
      >
        <div
          id="dashboard-spark-learn-card"
          className="dashboard-surface-card dashboard-spark-learn-inner"
          style={{
            ...cardShell,
            background: "#ffffff",
            width: "100%",
            minWidth: 0,
            height: "100%",
            minHeight: 0,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ ...sectionTitle, marginBottom: 0, letterSpacing: "0.1em" }}>Spark &amp; learn</div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#6366f1",
                background: "#eef2ff",
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #c7d2fe",
              }}
            >
              Optional
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, flex: 1 }}>
            <button
              type="button"
              onClick={() => router.push("/flow/new-goal")}
              className="dashboard-spark-action"
              style={{
                width: "100%",
                margin: 0,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#fff",
                padding: "9px 10px",
                display: "grid",
                gridTemplateColumns: "28px 1fr 12px",
                alignItems: "center",
                columnGap: 8,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #c7d2fe",
                }}
              >
                <Zap size={14} strokeWidth={2} color="#4f46e5" aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Set a goal
                </span>
              </span>
              <ArrowUpRight size={12} strokeWidth={2} color="#94a3b8" className="dashboard-spark-action-chevron" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => router.push("/demo")}
              className="dashboard-spark-action"
              style={{
                width: "100%",
                margin: 0,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#fff",
                padding: "9px 10px",
                display: "grid",
                gridTemplateColumns: "28px 1fr 12px",
                alignItems: "center",
                columnGap: 8,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #cbd5e1",
                }}
              >
                <PlayCircle size={14} strokeWidth={2} color="#475569" aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Watch demo
                </span>
              </span>
              <ArrowUpRight size={12} strokeWidth={2} color="#94a3b8" className="dashboard-spark-action-chevron" aria-hidden />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
