"use client";

import { Lock } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import type { SetupStepKey, SetupStepVisualStatus } from "@/components/ui/dashboardSetupProgressUtils";

const DOT = 30;
const RING = 2.5;
const RING_PAD = 3;
const CHECK = 15;

const LABELS: { key: SetupStepKey; label: string }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "leads", label: "Add leads" },
  { key: "campaign", label: "Campaign" },
];

function StepNode({
  status,
  stepNumber,
}: {
  status: SetupStepVisualStatus;
  stepNumber: 1 | 2 | 3;
}) {
  const isComplete = status === "complete";
  const isLocked = status === "locked";

  return (
    <div
      style={{
        padding: RING_PAD,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          fontSize: 13,
          fontWeight: 700,
          boxSizing: "border-box",
          border: isComplete
            ? "none"
            : !isLocked
              ? `${Math.round(RING)}px solid var(--color-primary, #2563EB)`
              : "1px solid #E5E7EB",
          background: isComplete ? "#059669" : !isLocked ? "rgba(37, 99, 235, 0.08)" : "#F9FAFB",
          color: isComplete ? "#FFFFFF" : !isLocked ? "var(--color-primary, #2563EB)" : "#9CA3AF",
          boxShadow: !isComplete && !isLocked ? "0 0 0 4px rgba(37, 99, 235, 0.2)" : "none",
        }}
      >
        {isComplete ? (
          <Icons.Check size={CHECK} strokeWidth={2.5} />
        ) : isLocked ? (
          <Lock strokeWidth={2.25} size={14} style={{ color: "#94A3B8" }} aria-hidden />
        ) : (
          stepNumber
        )}
      </div>
    </div>
  );
}

function HConnector({ done }: { done: boolean }) {
  const lineH = 2;
  const marginTop = RING_PAD + DOT / 2 - lineH / 2;
  return (
    <div
      aria-hidden
      className="dgsc-h-connector"
      style={{
        flex: "1 1 16px",
        height: lineH,
        alignSelf: "flex-start",
        marginTop,
        borderRadius: 2,
        background: done ? "#059669" : "#E5E7EB",
        minWidth: 12,
        maxWidth: "100%",
      }}
    />
  );
}

export type DashboardSetupHorizontalTrackProps = {
  states: Record<SetupStepKey, SetupStepVisualStatus>;
};

/** Compact horizontal stepper: Workspace — Add leads — Campaign (matches Get started cards below). */
export default function DashboardSetupHorizontalTrack({ states }: DashboardSetupHorizontalTrackProps) {
  return (
    <nav className="dgsc-h-track" aria-label="Setup steps overview">
      <div className="dgsc-h-track-col">
        <StepNode status={states.workspace} stepNumber={1} />
        <span
          className="dgsc-h-track-lbl"
          style={{
            fontSize: 11,
            fontWeight: states.workspace === "current" ? 600 : 500,
            color:
              states.workspace === "current"
                ? "var(--color-text, #0f172a)"
                : states.workspace === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            marginTop: 4,
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {LABELS[0].label}
        </span>
      </div>
      <HConnector done={states.workspace === "complete"} />
      <div className="dgsc-h-track-col">
        <StepNode status={states.leads} stepNumber={2} />
        <span
          className="dgsc-h-track-lbl"
          style={{
            fontSize: 11,
            fontWeight: states.leads === "current" ? 600 : 500,
            color:
              states.leads === "current"
                ? "var(--color-text, #0f172a)"
                : states.leads === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            marginTop: 4,
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {LABELS[1].label}
        </span>
      </div>
      <HConnector done={states.leads === "complete"} />
      <div className="dgsc-h-track-col">
        <StepNode status={states.campaign} stepNumber={3} />
        <span
          className="dgsc-h-track-lbl"
          style={{
            fontSize: 11,
            fontWeight: states.campaign === "current" ? 600 : 500,
            color:
              states.campaign === "current"
                ? "var(--color-text, #0f172a)"
                : states.campaign === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            marginTop: 4,
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {LABELS[2].label}
        </span>
      </div>
    </nav>
  );
}
