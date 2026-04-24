/**
 * Must match backend `CAMPAIGN_FOLLOWUP_DELAY_UNIT` when testing (minutes vs days).
 * Set `NEXT_PUBLIC_CAMPAIGN_FOLLOWUP_DELAY_UNIT=minutes` in `.env.local` alongside the API env flag.
 */
export type FollowupDelayUnit = "days" | "minutes";

function readFollowupDelayUnit(): FollowupDelayUnit {
  const raw =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CAMPAIGN_FOLLOWUP_DELAY_UNIT : undefined;
  const u = String(raw ?? "")
    .toLowerCase()
    .trim();
  return u === "minute" || u === "minutes" ? "minutes" : "days";
}

export const FOLLOWUP_DELAY_UNIT: FollowupDelayUnit = readFollowupDelayUnit();

export const FOLLOWUP_DELAY_UI =
  FOLLOWUP_DELAY_UNIT === "minutes"
    ? ({
        unit: "minutes" as const,
        min: 1,
        max: 120,
        defaultDelay: 3,
        label: "Follow-up delay (minutes between emails)",
        hint: "1–120 minutes between each follow-up (default 3). Set `CAMPAIGN_FOLLOWUP_DELAY_UNIT=minutes` on the API and this same flag in `.env.local` for testing.",
        scheduleInfoHint:
          "You can set the delay between follow-ups (in minutes, when test mode is on) on the schedule step.",
      } as const)
    : ({
        unit: "days" as const,
        min: 1,
        max: 30,
        defaultDelay: 3,
        label: "Follow-up delay (days between emails)",
        hint: "1–30 days between each follow-up (default 3).",
        scheduleInfoHint: "You can configure the delay between follow-ups (in days) on the schedule step.",
      } as const);

/** Cumulative offset from first send for timeline chips (same numeric field as backend spacing). */
export function followupTimelineChipLabel(
  index: number,
  spacing: number,
  unit: FollowupDelayUnit = FOLLOWUP_DELAY_UNIT
): string {
  const offset = index * spacing;
  if (unit === "minutes") {
    if (index === 0) return "Initial send";
    return `+${offset} min`;
  }
  return `Day ${offset}`;
}
