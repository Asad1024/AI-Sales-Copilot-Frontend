"use client";

import { Check, Folder, Lock } from "lucide-react";

export type DashboardGetStartedChecklistProps = {
  activeBaseId: number | null;
  hasLeads: boolean;
  hasCampaigns: boolean;
  setupStepsDone: number;
  setupStepsTotal: number;
  setupProgressPct: number;
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
  if (state === "active") return "dgsc-step dgsc-step--active";
  if (state === "complete") return "dgsc-step dgsc-step--complete";
  return "dgsc-step dgsc-step--locked";
}

function StepIndicator({ state }: { state: StepState }) {
  if (state === "complete") {
    return (
      <div className="dgsc-ind dgsc-ind--complete" aria-hidden>
        <Check strokeWidth={2.5} />
      </div>
    );
  }
  if (state === "locked") {
    return (
      <div className="dgsc-ind dgsc-ind--locked" aria-hidden>
        <Lock strokeWidth={2} />
      </div>
    );
  }
  return <div className="dgsc-ind dgsc-ind--active" aria-hidden />;
}

export default function DashboardGetStartedChecklist({
  activeBaseId,
  hasLeads,
  hasCampaigns,
  setupStepsDone,
  setupStepsTotal,
  setupProgressPct,
  onCreateWorkspace,
  onAddLeads,
  onCreateCampaign,
}: DashboardGetStartedChecklistProps) {
  const { s1, s2, s3 } = stepStates(activeBaseId, hasLeads, hasCampaigns);

  return (
    <div className="dgsc-root">
      <div className="dgsc-header">
        <span className="dgsc-title">Get started</span>
        <span className="dgsc-badge">
          {setupStepsDone}/{setupStepsTotal} steps
        </span>
      </div>

      <div className="dgsc-progress" aria-hidden>
        <div className="dgsc-progress-fill" style={{ width: `${setupProgressPct}%` }} />
      </div>

      <div className="dgsc-body">
        <div className="dgsc-folder" aria-hidden>
          <Folder strokeWidth={1.75} />
        </div>

        <ol className="dgsc-steps" aria-label="Onboarding checklist">
          <li className={stepCardClass(s1)}>
            <div className="dgsc-step-row">
              <StepIndicator state={s1} />
              <div className="dgsc-step-main">
                <p className="dgsc-step-title">Create your workspace</p>
                <p className="dgsc-step-desc">
                  Workspaces organize leads and campaigns. Create one to continue.
                </p>
                {s1 === "active" && (
                  <button type="button" onClick={onCreateWorkspace} className="dgsc-step-cta">
                    Create workspace
                  </button>
                )}
              </div>
            </div>
          </li>

          <li className={stepCardClass(s2)}>
            <div className="dgsc-step-row">
              <StepIndicator state={s2} />
              <div className="dgsc-step-main">
                <p
                  className={
                    s2 === "locked" ? "dgsc-step-title dgsc-step-title--muted" : "dgsc-step-title"
                  }
                >
                  Add your first leads
                </p>
                <p
                  className={
                    s2 === "locked" ? "dgsc-step-desc dgsc-step-desc--muted" : "dgsc-step-desc"
                  }
                >
                  Import or add contacts so you have recipients for outreach.
                </p>
                {s2 === "active" && (
                  <button type="button" onClick={onAddLeads} className="dgsc-step-cta">
                    Add leads
                  </button>
                )}
              </div>
            </div>
          </li>

          <li className={stepCardClass(s3)}>
            <div className="dgsc-step-row">
              <StepIndicator state={s3} />
              <div className="dgsc-step-main">
                <p
                  className={
                    s3 === "locked" ? "dgsc-step-title dgsc-step-title--muted" : "dgsc-step-title"
                  }
                >
                  Launch your first campaign
                </p>
                <p
                  className={
                    s3 === "locked" ? "dgsc-step-desc dgsc-step-desc--muted" : "dgsc-step-desc"
                  }
                >
                  Start email, LinkedIn, or WhatsApp sequences from this workspace.
                </p>
                {s3 === "active" && (
                  <button type="button" onClick={onCreateCampaign} className="dgsc-step-cta">
                    Create campaign
                  </button>
                )}
                {s3 === "complete" && hasCampaigns && (
                  <button
                    type="button"
                    onClick={onCreateCampaign}
                    className="dgsc-step-cta dgsc-step-cta--secondary"
                  >
                    Create another campaign
                  </button>
                )}
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
