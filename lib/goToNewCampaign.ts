/** Workspaces list / create flow (no active base selected). */
export const WORKSPACES_PATH = "/bases";

export function hasActiveWorkspace(activeBaseId: unknown): boolean {
  if (activeBaseId === null || activeBaseId === undefined) return false;
  if (typeof activeBaseId === "string") {
    const t = activeBaseId.trim();
    if (t === "") return false;
    const n = Number(t);
    return !Number.isNaN(n) && n > 0;
  }
  if (typeof activeBaseId === "number") {
    return !Number.isNaN(activeBaseId) && activeBaseId > 0;
  }
  return false;
}

/**
 * If there is no active workspace, go to workspaces. Otherwise open new campaign.
 */
export function goToNewCampaignOrWorkspaces(router: { push: (url: string) => void }, activeBaseId: unknown): void {
  if (!hasActiveWorkspace(activeBaseId)) {
    router.push(WORKSPACES_PATH);
    return;
  }
  router.push("/campaigns/new");
}
