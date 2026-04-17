/**
 * Shared setup path: workspace → leads → campaign.
 * Used by the horizontal stepper and the Get started vertical rail so they never drift.
 */

export type SetupStepVisualStatus = "complete" | "current" | "locked";

export type SetupStepKey = "workspace" | "leads" | "campaign";

export function getSetupStepVisualStates(
  activeBaseId: number | null,
  hasLeads: boolean,
  hasCampaigns: boolean
): Record<SetupStepKey, SetupStepVisualStatus> {
  const hasWorkspace = Boolean(activeBaseId);

  const workspace: SetupStepVisualStatus = hasWorkspace ? "complete" : "current";

  const leads: SetupStepVisualStatus = !hasWorkspace
    ? "locked"
    : hasLeads
      ? "complete"
      : "current";

  const campaign: SetupStepVisualStatus =
    !hasWorkspace || !hasLeads ? "locked" : hasCampaigns ? "complete" : "current";

  return { workspace, leads, campaign };
}
