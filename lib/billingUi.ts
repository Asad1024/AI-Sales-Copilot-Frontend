import type { User } from "./apiClient";

/** Minimal base row from GET /bases — must include workspace owner id. */
export type BaseForBillingUi = { user_id: number };

/**
 * Hide Upgrade, Payments, and header billing CTAs for:
 * - Invite-only accounts (`team_member_only`), or
 * - Users who only collaborate on others’ workspaces (own none), once bases are loaded.
 *
 * When `basesLoading` is true we only treat `team_member_only` as reliable so we don’t
 * flash-hide for owners before /bases returns.
 */
export function shouldHideBillingAndUpgrade(
  user: User | null,
  bases: BaseForBillingUi[],
  basesLoading: boolean
): boolean {
  if (!user) return false;
  if (user.restrict_billing_ui === true) return true;
  if (user.restrict_billing_ui === false) return false;
  if (user.team_member_only) return true;
  if (basesLoading) return false;
  if (bases.length === 0) return false;
  return !bases.some((b) => b.user_id === user.id);
}

/**
 * Same rules as {@link shouldHideBillingAndUpgrade}, but returns `null` while the
 * session user or workspace list is not yet ready so `/upgrade` can show a loader
 * instead of flashing pricing for collaborator-only accounts.
 */
export function shouldBlockUpgradeRoute(
  user: User | null,
  bases: BaseForBillingUi[],
  basesLoading: boolean
): boolean | null {
  if (!user) return null;
  if (user.restrict_billing_ui === true) return true;
  if (user.restrict_billing_ui === false) return false;
  if (user.team_member_only) return true;
  if (basesLoading) return null;
  if (bases.length === 0) return false;
  return !bases.some((b) => b.user_id === user.id);
}

/** @alias {@link shouldHideBillingAndUpgrade} — workspace create / rename / delete for the same cohort */
export { shouldHideBillingAndUpgrade as shouldRestrictWorkspaceManagement };
