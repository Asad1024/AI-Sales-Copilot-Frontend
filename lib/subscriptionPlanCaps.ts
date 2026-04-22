/** Workspace subscription tier on the owner (from `/bases/:id/workspace-credits`). */

export function isEmailOnlyWorkspacePlan(ownerBillingPlanKey: string | null | undefined): boolean {
  const k = (ownerBillingPlanKey ?? "").trim().toLowerCase();
  return k === "basic" || k === "free" || k === "";
}

export function filterChannelsForWorkspaceOwnerPlan(
  channels: readonly string[],
  ownerBillingPlanKey: string | null | undefined
): string[] {
  if (!isEmailOnlyWorkspacePlan(ownerBillingPlanKey)) return [...channels];
  const next = channels.filter((c) => c !== "linkedin" && c !== "whatsapp");
  return next.length > 0 ? [...next] : ["email"];
}
