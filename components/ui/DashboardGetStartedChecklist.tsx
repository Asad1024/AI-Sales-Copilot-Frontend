"use client";

import { Lock } from "lucide-react";
import DashboardSetupHorizontalTrack from "@/components/ui/DashboardSetupHorizontalTrack";
import { Icons } from "@/components/ui/Icons";
import { getSetupStepVisualStates } from "@/components/ui/dashboardSetupProgressUtils";

export type DashboardGetStartedChecklistProps = {
  activeBaseId: number | null;
  hasLeads: boolean;
  hasCampaigns: boolean;
  setupStepsDone: number;
  setupStepsTotal: number;
  onCreateWorkspace: () => void;
  onAddLeads: () => void;
  onCreateCampaign: () => void;
};

type StepState = "complete" | "active" | "locked";

function stepStates(activeBaseId: number | null, hasLeads: boolean, hasCampaigns: boolean) {
  const s1c = Boolean(activeBaseId);
  const s2c = hasLeads;
  const s3c = hasCampaigns;
  const s1: StepState = s1c ? "complete" : "active";
  const s2: StepState = !s1c ? "locked" : s2c ? "complete" : "active";
  const s3: StepState = !s1c || !s2c ? "locked" : s3c ? "complete" : "active";
  return { s1, s2, s3 };
}

function stepCardClass(state: StepState): string {
  if (state === "active") return "dgsc-step dgsc-step--active dgsc-step--compact";
  if (state === "complete") return "dgsc-step dgsc-step--complete dgsc-step--compact";
  return "dgsc-step dgsc-step--locked dgsc-step--compact";
}

export default function DashboardGetStartedChecklist({
  activeBaseId,
  hasLeads,
  hasCampaigns,
  setupStepsDone,
  setupStepsTotal,
  onCreateWorkspace,
  onAddLeads,
  onCreateCampaign,
}: DashboardGetStartedChecklistProps) {
  const { s1, s2, s3 } = stepStates(activeBaseId, hasLeads, hasCampaigns);
  const setupVisualStates = getSetupStepVisualStates(activeBaseId, hasLeads, hasCampaigns);
  const setupProgressPct = Math.round((setupStepsDone / Math.max(setupStepsTotal, 1)) * 100);

  return (
    <div className="dgsc-root" data-tour="dashboard-get-started">
      <div className="dgsc-header">
        <span className="dgsc-title">Get started</span>
        <span className="dgsc-badge">
          {setupStepsDone}/{setupStepsTotal} steps
        </span>
      </div>

      {false && (
        <div className="dgsc-progress" aria-hidden>
          <div className="dgsc-progress-fill" style={{ width: `${setupProgressPct}%` }} />
        </div>
      )}

      <p className="dgsc-rail-hint">Workspace → add leads → campaign. Finish each step to unlock the next.</p>

      <div className="dgsc-h-wrap">
        <DashboardSetupHorizontalTrack states={setupVisualStates} />

        <ol className="dgsc-steps dgsc-steps--horizontal" aria-label="Onboarding checklist">
          <li className={stepCardClass(s1)}>
            <div className="dgsc-step-card-inner">
              <p className="dgsc-step-title dgsc-step-title--card-heading">Create your workspace</p>
              <p className="dgsc-step-desc">
                Workspaces organize leads and campaigns. Create one to continue.
              </p>
              <div className="dgsc-step-cta-slot">
                {s1 === "active" ? (
                  <button type="button" onClick={onCreateWorkspace} className="dgsc-step-cta">
                    Create Workspace
                  </button>
                ) : s1 === "complete" ? (
                  <span className="dgsc-step-cta-done" aria-label="Done">
                    <Icons.Check size={18} strokeWidth={2.5} style={{ color: "#059669" }} aria-hidden />
                  </span>
                ) : null}
              </div>
            </div>
          </li>

          <li className={stepCardClass(s2)}>
            <div className="dgsc-step-card-inner">
              <p
                className={
                  s2 === "locked"
                    ? "dgsc-step-title dgsc-step-title--card-heading dgsc-step-title--muted"
                    : "dgsc-step-title dgsc-step-title--card-heading"
                }
              >
                Add your leads
              </p>
              <p
                className={
                  s2 === "locked" ? "dgsc-step-desc dgsc-step-desc--muted" : "dgsc-step-desc"
                }
              >
                Import or add contacts so you have recipients for outreach.
              </p>
              <div className="dgsc-step-cta-slot">
                {s2 === "locked" ? (
                  <span className="dgsc-step-cta-locked" aria-hidden>
                    <Lock size={18} strokeWidth={2.25} />
                  </span>
                ) : s2 === "active" ? (
                  <button type="button" onClick={onAddLeads} className="dgsc-step-cta">
                    Add leads
                  </button>
                ) : (
                  <span className="dgsc-step-cta-done" aria-label="Done">
                    <Icons.Check size={18} strokeWidth={2.5} style={{ color: "#059669" }} aria-hidden />
                  </span>
                )}
              </div>
            </div>
          </li>

          <li className={stepCardClass(s3)}>
            <div className="dgsc-step-card-inner">
              <p
                className={
                  s3 === "locked"
                    ? "dgsc-step-title dgsc-step-title--card-heading dgsc-step-title--muted"
                    : "dgsc-step-title dgsc-step-title--card-heading"
                }
              >
                Launch your campaign
              </p>
              <p
                className={
                  s3 === "locked" ? "dgsc-step-desc dgsc-step-desc--muted" : "dgsc-step-desc"
                }
              >
                Start email, LinkedIn, or WhatsApp sequences from this workspace.
              </p>
              <div className="dgsc-step-cta-slot">
                {s3 === "locked" ? (
                  <span className="dgsc-step-cta-locked" aria-hidden>
                    <Lock size={18} strokeWidth={2.25} />
                  </span>
                ) : s3 === "active" ? (
                  <button type="button" onClick={onCreateCampaign} className="dgsc-step-cta">
                    Create campaign
                  </button>
                ) : hasCampaigns ? (
                  <button
                    type="button"
                    onClick={onCreateCampaign}
                    className="dgsc-step-cta dgsc-step-cta--secondary"
                  >
                    Create another campaign
                  </button>
                ) : (
                  <span className="dgsc-step-cta-done" aria-label="Done">
                    <Icons.Check size={18} strokeWidth={2.5} style={{ color: "#059669" }} aria-hidden />
                  </span>
                )}
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
