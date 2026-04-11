"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";
import type { StepInfo } from "./stepFlowCalculator";
import { WIZARD_STEP_SHORT_LABEL } from "./wizardStepLabels";

const ACCENT = "#5b4fc9";
const ACCENT_SOFT = "rgba(91, 79, 201, 0.45)";
const TRACK_INCOMPLETE = "#cbd5e1";
const LABEL_INACTIVE = "#9ca3af";

/** Same height for every step’s circle row so connector lines share one vertical center. */
const CONNECTOR_ROW_MIN_HEIGHT = 48;

const MAX_VISIBLE_STEPS = 7;

type Props = {
  steps: StepInfo[];
  currentStepNumber: number;
  /** When set, clicking a step jumps there (parent persists + sets step). */
  onStepClick?: (stepNumber: number) => void;
  /** True while parent is saving / navigating — step targets ignore clicks. */
  navigationDisabled?: boolean;
};

/** Default window start: ~3 steps before current, clamped (max 7 visible). */
function getDefaultWindowStart(total: number, currentIdx: number): number {
  if (total <= MAX_VISIBLE_STEPS) return 0;
  const safeIdx = Math.max(0, Math.min(currentIdx, total - 1));
  let start = Math.max(0, safeIdx - 3);
  let end = start + MAX_VISIBLE_STEPS - 1;
  if (end > total - 1) {
    end = total - 1;
    start = Math.max(0, end - (MAX_VISIBLE_STEPS - 1));
  }
  return start;
}

/** Pannable range: window must stay wide enough to include the current step. */
function getPanBounds(total: number, curIdx: number): { min: number; max: number } {
  if (total <= MAX_VISIBLE_STEPS) return { min: 0, max: 0 };
  const safe = Math.max(0, Math.min(curIdx, total - 1));
  const min = Math.max(0, safe - (MAX_VISIBLE_STEPS - 1));
  const max = Math.min(total - MAX_VISIBLE_STEPS, safe);
  return { min, max };
}

/**
 * Windowed stepper (max 7). When there are more steps, left/right controls at the end pan the window.
 */
export function WizardCircularStepper({
  steps,
  currentStepNumber,
  onStepClick,
  navigationDisabled = false,
}: Props) {
  const [panStart, setPanStart] = useState<number | null>(null);

  useEffect(() => {
    setPanStart(null);
  }, [currentStepNumber]);

  if (steps.length <= 1) return null;

  const n = steps.length;
  const currentIdx = steps.findIndex((s) => s.stepNumber === currentStepNumber);
  const curIdx = currentIdx >= 0 ? currentIdx : 0;
  const needsWindow = n > MAX_VISIBLE_STEPS;
  const { min: startMin, max: startMax } = getPanBounds(n, curIdx);
  const defaultStart = getDefaultWindowStart(n, curIdx);
  const windowStart =
    panStart != null
      ? Math.min(startMax, Math.max(startMin, panStart))
      : defaultStart;
  const windowEnd = needsWindow ? windowStart + MAX_VISIBLE_STEPS - 1 : n - 1;

  /** On the final wizard step, pan chevrons stay off (no window nudge past “done”). */
  const atLastWizardStep = curIdx >= n - 1;
  const canPanLeft =
    needsWindow && windowStart > startMin && !atLastWizardStep;
  const canPanRight =
    needsWindow && windowStart < startMax && !atLastWizardStep;

  const stepClickable = Boolean(onStepClick) && !navigationDisabled;

  const renderStepColumn = (s: StepInfo, globalIdx: number) => {
    const isCurrent = s.stepNumber === currentStepNumber;
    const isPast = s.stepNumber < currentStepNumber;
    const isFuture = !isCurrent && !isPast;
    const label = WIZARD_STEP_SHORT_LABEL[s.stepType] || s.stepType;

    const leftComplete =
      globalIdx > 0 && currentStepNumber > steps[globalIdx - 1]!.stepNumber;
    const rightComplete = currentStepNumber > s.stepNumber;

    const circleSize = isCurrent ? 40 : 30;
    const borderW = isCurrent ? 3 : 2;

    const circleSpan = (
      <span
        aria-current={isCurrent ? "step" : undefined}
        title={`Step ${s.stepNumber}: ${label}`}
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          flexShrink: 0,
          boxSizing: "border-box",
          border: `${borderW}px solid ${
            isCurrent
              ? ACCENT
              : isPast
                ? ACCENT
                : "var(--color-border, #e2e8f0)"
          }`,
          background: isCurrent
            ? ACCENT
            : isPast
              ? ACCENT
              : "var(--color-surface, #fff)",
          boxShadow: isCurrent ? "0 4px 14px rgba(91, 79, 201, 0.35)" : "none",
          transition:
            "width 0.2s, height 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isCurrent ? 14 : 12,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: isCurrent || isPast ? "#fff" : LABEL_INACTIVE,
        }}
      >
        {isPast ? (
          <Icons.Check size={isCurrent ? 20 : 16} strokeWidth={2.5} style={{ color: "#fff" }} />
        ) : (
          s.stepNumber
        )}
      </span>
    );

    const labelSpan = (
      <span
        style={{
          fontSize: 11,
          fontWeight: isCurrent ? 700 : isPast ? 600 : 500,
          color: isCurrent ? ACCENT : isFuture ? LABEL_INACTIVE : ACCENT,
          textAlign: "center",
          lineHeight: 1.25,
          maxWidth: "100%",
          padding: "0 2px",
          overflow: "hidden",
          maxHeight: 30,
          wordBreak: "break-word",
        }}
      >
        {label}
      </span>
    );

    const connectorRow = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: CONNECTOR_ROW_MIN_HEIGHT,
          marginBottom: 10,
        }}
      >
        <div
          aria-hidden
          style={{
            flex: 1,
            height: 4,
            minWidth: 6,
            borderRadius: 2,
            background:
              globalIdx === 0
                ? "transparent"
                : leftComplete
                  ? ACCENT_SOFT
                  : TRACK_INCOMPLETE,
          }}
        />
        {circleSpan}
        <div
          aria-hidden
          style={{
            flex: 1,
            height: 4,
            minWidth: 6,
            borderRadius: 2,
            background:
              globalIdx >= n - 1
                ? "transparent"
                : rightComplete
                  ? ACCENT_SOFT
                  : TRACK_INCOMPLETE,
          }}
        />
      </div>
    );

    return (
      <div
        key={`${s.stepNumber}-${s.stepType}`}
        style={{
          flex: "1 1 0",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {stepClickable ? (
          <button
            type="button"
            aria-label={`Go to step ${s.stepNumber}: ${label}`}
            onClick={() => onStepClick?.(s.stepNumber)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              margin: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
              textAlign: "center",
            }}
          >
            {connectorRow}
            {labelSpan}
          </button>
        ) : (
          <>
            {connectorRow}
            {labelSpan}
          </>
        )}
      </div>
    );
  };

  const segments: ReactNode[] = [];
  if (needsWindow) {
    for (let gi = windowStart; gi <= windowEnd; gi++) {
      segments.push(renderStepColumn(steps[gi]!, gi));
    }
  } else {
    for (let gi = 0; gi < n; gi++) {
      segments.push(renderStepColumn(steps[gi]!, gi));
    }
  }

  const panBtnBase = {
    flex: 1,
    minWidth: 36,
    height: CONNECTOR_ROW_MIN_HEIGHT,
    padding: 0,
    margin: 0,
    border: "none",
    background: "transparent",
    color: ACCENT,
    cursor: "pointer" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transform: "none" as const,
  };

  return (
    <div
      role="navigation"
      aria-label="Campaign wizard steps"
      style={{
        width: "100%",
        padding: "8px 0 4px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            minWidth: 0,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {segments}
        </div>
        {needsWindow ? (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              alignSelf: "flex-start",
              paddingTop: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: CONNECTOR_ROW_MIN_HEIGHT,
                marginBottom: 10,
                borderRadius: 999,
                border: `2px solid ${ACCENT}`,
                background: "var(--color-surface, #fff)",
                boxShadow: "0 2px 8px rgba(91, 79, 201, 0.12)",
                overflow: "hidden",
              }}
              role="group"
              aria-label="Scroll steps"
            >
              <button
                type="button"
                aria-label="Show earlier steps"
                title="Earlier steps"
                disabled={!canPanLeft}
                onClick={() => {
                  const base = panStart != null ? windowStart : defaultStart;
                  setPanStart(Math.max(startMin, base - 1));
                }}
                style={{
                  ...panBtnBase,
                  opacity: canPanLeft ? 1 : 0.35,
                  cursor: canPanLeft ? "pointer" : "not-allowed",
                }}
              >
                <Icons.ChevronLeft size={18} aria-hidden />
              </button>
              <div
                aria-hidden
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  background: "rgba(91, 79, 201, 0.35)",
                  flexShrink: 0,
                }}
              />
              <button
                type="button"
                aria-label="Show later steps"
                title="Later steps"
                disabled={!canPanRight}
                onClick={() => {
                  const base = panStart != null ? windowStart : defaultStart;
                  setPanStart(Math.min(startMax, base + 1));
                }}
                style={{
                  ...panBtnBase,
                  opacity: canPanRight ? 1 : 0.35,
                  cursor: canPanRight ? "pointer" : "not-allowed",
                }}
              >
                <Icons.ChevronRight size={18} aria-hidden />
              </button>
            </div>
            {/* Spacer aligns with step label row under circles */}
            <div style={{ minHeight: 30, marginTop: 0 }} aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
