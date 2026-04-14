import type { ReadonlyURLSearchParams } from "next/navigation";
import { apiRequest, getUser, type User } from "./apiClient";
import { rememberTeamWorkspaceAfterInvite } from "./focusTeamWorkspace";

type AppRouter = { push: (href: string) => void };

export function userNeedsOnboarding(user: User | null | undefined): boolean {
  if (!user || user.email_verified !== true) return false;
  if (user.team_member_only === true) return false;
  return user.onboarding_completed !== true;
}

/**
 * After login / Google / session restore: verify email, onboarding, invitations, then dashboard.
 */
export async function routeAfterSuccessfulSession(
  router: AppRouter,
  searchParams: ReadonlyURLSearchParams | null
): Promise<void> {
  const me = getUser();
  if (!me) return;

  const invitationToken =
    searchParams?.get("invitation")?.trim() ||
    (typeof window !== "undefined" ? sessionStorage.getItem("pendingInvitation")?.trim() : "") ||
    "";

  /** Accept workspace invite before verify-required / onboarding redirects (preserves invite in URL). */
  let inviteAcceptedOk = false;
  if (invitationToken) {
    try {
      const inviteResponse = await apiRequest(`/invitations/${invitationToken}/accept`, {
        method: "POST",
      });
      inviteAcceptedOk = true;
      if (typeof window !== "undefined") {
        const baseId = inviteResponse?.base?.id;
        if (baseId) rememberTeamWorkspaceAfterInvite(baseId);
        sessionStorage.setItem(
          "invitationAccepted",
          JSON.stringify({
            baseName: inviteResponse.base?.name,
            baseId: baseId ?? undefined,
            role: inviteResponse.role,
            message: inviteResponse.message,
          })
        );
        sessionStorage.removeItem("pendingInvitation");
      }
    } catch {
      /* Wrong account, expired token, etc. — keep token in sessionStorage / query for retry */
    }
  }

  if (me.email_verified === false) {
    const invQ = invitationToken
      ? `?invitation=${encodeURIComponent(invitationToken)}`
      : "";
    router.push(`/auth/verify-required${invQ}`);
    return;
  }
  if (me?.role === "admin") {
    router.push("/admin");
    return;
  }
  if (userNeedsOnboarding(me)) {
    router.push("/onboarding");
    return;
  }

  if (inviteAcceptedOk) {
    router.push("/dashboard?invited=true");
    return;
  }

  router.push("/dashboard");
}
