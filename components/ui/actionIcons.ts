import type { SVGProps } from "react";

/** Consistent sizing for view / edit / delete (and similar row actions) across the portal */
export const PORTAL_ACTION_ICON = {
  size: 16,
  strokeWidth: 1.5,
} as const;

export type PortalActionIconProps = Pick<SVGProps<SVGSVGElement>, "className" | "style">;
