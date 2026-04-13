/** After accepting a team invite, open that workspace once the app shell loads. */

const SESSION_KEY = "sparkai:focus_team_workspace_id";

export function rememberTeamWorkspaceAfterInvite(baseId: number | null | undefined): void {
  if (typeof window === "undefined") return;
  const n = typeof baseId === "number" ? baseId : Number(baseId);
  if (!Number.isFinite(n) || n <= 0) return;
  try {
    sessionStorage.setItem(SESSION_KEY, String(n));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readRememberedTeamWorkspaceId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function clearRememberedTeamWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
