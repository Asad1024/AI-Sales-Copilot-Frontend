"use client";

import { Lock } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import type { SetupStepKey, SetupStepVisualStatus } from "@/components/ui/dashboardSetupProgressUtils";

const DOT = 30;
const RING = 3;
const RING_PAD = 3;
const CHECK = 15;

const STEPS: { key: SetupStepKey; label: string }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "leads", label: "Add leads" },
  { key: "campaign", label: "Campaign" },
];

function VerticalStepNode({
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
      className="dgsc-vrail-node-wrap"
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
        className="dgsc-vrail-node"
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
              ? `${RING}px solid var(--color-primary, #2563EB)`
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

export type DashboardSetupVerticalRailProps = {
  states: Record<SetupStepKey, SetupStepVisualStatus>;
  className?: string;
};

/**
 * Same three steps as the horizontal “Getting started” track, laid out vertically with
 * lock icons for steps that are not available yet. Connectors stretch the full height between nodes.
 */
export default function DashboardSetupVerticalRail({ states, className }: DashboardSetupVerticalRailProps) {
  const lineBetween1and2 = states.workspace === "complete";
  const lineBetween2and3 = states.leads === "complete";

  return (
    <nav className={`dgsc-vrail ${className || ""}`} aria-label="Setup steps overview">
      <div className="dgsc-vrail-grid">
        <div className="dgsc-vrail-node-cell">
          <VerticalStepNode status={states.workspace} stepNumber={1} />
        </div>
        <span
          className="dgsc-vrail-label"
          style={{
            fontSize: 11,
            fontWeight: states.workspace === "current" ? 600 : 500,
            color:
              states.workspace === "current"
                ? "var(--color-text, #0f172a)"
                : states.workspace === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {STEPS[0].label}
        </span>

        <div
          className="dgsc-vrail-line"
          style={{ background: lineBetween1and2 ? "#059669" : "#E5E7EB" }}
          aria-hidden
        />
        <span className="dgsc-vrail-line-spacer" aria-hidden />

        <div className="dgsc-vrail-node-cell">
          <VerticalStepNode status={states.leads} stepNumber={2} />
        </div>
        <span
          className="dgsc-vrail-label"
          style={{
            fontSize: 11,
            fontWeight: states.leads === "current" ? 600 : 500,
            color:
              states.leads === "current"
                ? "var(--color-text, #0f172a)"
                : states.leads === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {STEPS[1].label}
        </span>

        <div
          className="dgsc-vrail-line"
          style={{ background: lineBetween2and3 ? "#059669" : "#E5E7EB" }}
          aria-hidden
        />
        <span className="dgsc-vrail-line-spacer" aria-hidden />

        <div className="dgsc-vrail-node-cell">
          <VerticalStepNode status={states.campaign} stepNumber={3} />
        </div>
        <span
          className="dgsc-vrail-label"
          style={{
            fontSize: 11,
            fontWeight: states.campaign === "current" ? 600 : 500,
            color:
              states.campaign === "current"
                ? "var(--color-text, #0f172a)"
                : states.campaign === "complete"
                  ? "#374151"
                  : "#9CA3AF",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {STEPS[2].label}
        </span>
      </div>
    </nav>
  );
}
