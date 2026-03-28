import type { ReadonlyURLSearchParams } from "next/navigation";
import { apiRequest, getUser, type User } from "./apiClient";

type AppRouter = { push: (href: string) => void };

export function userNeedsOnboarding(user: User | null | undefined): boolean {
  if (!user || user.email_verified !== true) return false;
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
  if (me && me.email_verified === false) {
    router.push("/auth/verify-required");
    return;
  }
  if (userNeedsOnboarding(me)) {
    router.push("/onboarding");
    return;
  }

  const invitationToken =
    searchParams?.get("invitation") ??
    (typeof window !== "undefined" ? sessionStorage.getItem("pendingInvitation") : null);

  if (invitationToken) {
    try {
      const inviteResponse = await apiRequest(`/invitations/${invitationToken}/accept`, {
        method: "POST",
      });
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "invitationAccepted",
          JSON.stringify({
            baseName: inviteResponse.base?.name,
            role: inviteResponse.role,
            message: inviteResponse.message,
          })
        );
        sessionStorage.removeItem("pendingInvitation");
      }
      router.push("/dashboard?invited=true");
      return;
    } catch {
      /* continue to dashboard */
    }
  }

  router.push("/dashboard");
}
