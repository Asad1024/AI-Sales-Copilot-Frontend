"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/ui/Icons";
import type { StepInfo } from "./stepFlowCalculator";
import { WIZARD_STEP_SHORT_LABEL } from "./wizardStepLabels";

/** Matches app `--color-primary` (var(--color-primary)) */
const ACCENT = "var(--color-primary)";
const ACCENT_SOFT = "rgba(var(--color-primary-rgb), 0.2)";
const TRACK_INCOMPLETE = "var(--color-border, #cbd5e1)";
const LABEL_INACTIVE = "var(--color-text-muted, #9ca3af)";

/** How many step columns stay visible at once; wider flows scroll horizontally. */
const MAX_VISIBLE_STEPS = 8;
/** Right padding when chevron overlay is shown so the last circle does not sit under it. */
const STEP_SCROLL_END_GUTTER = 22;
/** Left padding when chevron overlay is shown so the first circle does not sit under it. */
const STEP_SCROLL_START_GUTTER = 22;

type StepperMetrics = {
  colWidth: number;
  gap: number;
  circleCurrent: number;
  circleOther: number;
  borderCurrent: number;
  borderOther: number;
  numFontCurrent: number;
  numFontOther: number;
  checkCurrent: number;
  checkOther: number;
  labelFont: number;
  labelMaxHeight: number;
  connectorRowMinHeight: number;
  trackHeight: number;
  trackMinWidth: number;
  rowMarginBottom: number;
};

/** Fixed stepper geometry — no viewport scaling (8-slot window scrolls only). */
const WIZARD_STEPPER_METRICS: StepperMetrics = {
  colWidth: 108,
  gap: 12,
  circleCurrent: 48,
  circleOther: 36,
  borderCurrent: 4,
  borderOther: 2,
  numFontCurrent: 16,
  numFontOther: 13,
  checkCurrent: 24,
  checkOther: 18,
  labelFont: 12,
  labelMaxHeight: 42,
  connectorRowMinHeight: 54,
  trackHeight: 5,
  trackMinWidth: 8,
  rowMarginBottom: 12,
};

function minStepperRowWidth(stepCount: number, m: StepperMetrics): number {
  if (stepCount <= 1) return 0;
  return stepCount * m.colWidth + Math.max(0, stepCount - 1) * m.gap;
}

/** Pixel width of the first `slotCount` steps (used for 8-at-a-time viewport). */
function rowWidthForSlots(slotCount: number, m: StepperMetrics): number {
  if (slotCount <= 0) return 0;
  return slotCount * m.colWidth + Math.max(0, slotCount - 1) * m.gap;
}

type Props = {
  steps: StepInfo[];
  currentStepNumber: number;
  /** Keep steps checked up to this step even if user jumps back to earlier step. */
  completedThroughStepNumber?: number;
  /** When set, clicking a step jumps there (parent persists + sets step). */
  onStepClick?: (stepNumber: number) => void;
  /** True while parent is saving / navigating — step targets ignore clicks. */
  navigationDisabled?: boolean;
  /** Step column that shows an inline loader (e.g. save-before-jump in progress). */
  loadingStepNumber?: number | null;
};

/**
 * Horizontal stepper: at most 8 columns wide when there are more than 8 steps (then scroll).
 * Fixed pixel size (no resize scaling). Current step scrolls into view when navigating.
 */
export function WizardCircularStepper({
  steps,
  currentStepNumber,
  completedThroughStepNumber,
  onStepClick,
  navigationDisabled = false,
  loadingStepNumber = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const n = steps.length;
  const m = WIZARD_STEPPER_METRICS;
  const completedThrough = Math.max(currentStepNumber, completedThroughStepNumber ?? currentStepNumber);

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    if (steps.length <= 1) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>("[data-wizard-current-step='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    requestAnimationFrame(() => updateScrollEdges());
  }, [currentStepNumber, steps.length, updateScrollEdges]);

  useEffect(() => {
    if (loadingStepNumber == null || steps.length <= 1) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-wizard-step="${loadingStepNumber}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    requestAnimationFrame(() => updateScrollEdges());
  }, [loadingStepNumber, steps.length, updateScrollEdges]);

  /** Track overflow so the right chevron only shows when there is more to see. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || steps.length <= 1) return;
    updateScrollEdges();
    const onScroll = () => updateScrollEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateScrollEdges());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [steps.length, n, updateScrollEdges]);

  /** Vertical wheel scrolls the strip horizontally (Shift+wheel still uses native horizontal). */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || steps.length <= 1) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;
      const { deltaX, deltaY } = e;
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
      const nextLeft = el.scrollLeft + deltaY;
      const maxLeft = el.scrollWidth - el.clientWidth;
      if (deltaY < 0 && el.scrollLeft <= 0) return;
      if (deltaY > 0 && el.scrollLeft >= maxLeft - 1) return;
      el.scrollLeft = Math.max(0, Math.min(maxLeft, nextLeft));
      e.preventDefault();
      updateScrollEdges();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [steps.length, updateScrollEdges]);

  if (steps.length <= 1) return null;

  const stepClickable = Boolean(onStepClick) && !navigationDisabled;
  const rowPixelWidth = minStepperRowWidth(n, m);
  const visibleWindowPx =
    n > MAX_VISIBLE_STEPS
      ? rowWidthForSlots(MAX_VISIBLE_STEPS, m)
      : rowPixelWidth;
  const capScrollViewport = n > MAX_VISIBLE_STEPS;
  const trackOuterMaxCss = `min(100%, ${visibleWindowPx}px)`;
  const scrollPaneMaxCss = `min(100%, ${visibleWindowPx}px)`;
  const connectorBandHeight = m.connectorRowMinHeight;
  const centerOuter: "center" = "center";

  const renderStepColumn = (s: StepInfo, globalIdx: number) => {
    const isCurrent = s.stepNumber === currentStepNumber;
    const isCompleted = !isCurrent && s.stepNumber <= completedThrough;
    const isFuture = !isCurrent && !isCompleted;
    const isLoadingJump = loadingStepNumber != null && loadingStepNumber === s.stepNumber;
    const label = WIZARD_STEP_SHORT_LABEL[s.stepType] || s.stepType;

    const leftComplete =
      globalIdx > 0 && completedThrough > steps[globalIdx - 1]!.stepNumber;
    const rightComplete = completedThrough > s.stepNumber;

    const circleSize =
      isLoadingJump || isCurrent ? m.circleCurrent : m.circleOther;
    const borderW =
      isLoadingJump || isCurrent ? m.borderCurrent : m.borderOther;

    const circleSpan = (
      <span
        aria-current={isCurrent ? "step" : undefined}
        aria-busy={isLoadingJump ? true : undefined}
        title={`Step ${s.stepNumber}: ${label}`}
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          flexShrink: 0,
          boxSizing: "border-box",
          border: `${borderW}px solid ${
            isLoadingJump || isCurrent
              ? ACCENT
              : isCompleted
                ? ACCENT
                : "var(--color-border, #e2e8f0)"
          }`,
          background:
            isLoadingJump || isCurrent
              ? "var(--color-surface, #fff)"
              : isCompleted
                ? ACCENT
                : "var(--color-surface, #fff)",
          boxShadow: "none",
          transition:
            "width 0.2s, height 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isCurrent ? m.numFontCurrent : m.numFontOther,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: isCompleted ? "#fff" : isCurrent || isLoadingJump ? ACCENT : LABEL_INACTIVE,
        }}
      >
        {isLoadingJump ? (
          <Icons.Loader
            size={Math.max(14, Math.round(circleSize * 0.42))}
            strokeWidth={2.5}
            style={{ color: ACCENT, animation: "spin 0.85s linear infinite" }}
            aria-hidden
          />
        ) : isCompleted ? (
          <Icons.Check
            size={isCurrent ? m.checkCurrent : m.checkOther}
            strokeWidth={2.5}
            style={{ color: "#fff" }}
          />
        ) : (
          s.stepNumber
        )}
      </span>
    );

    const labelSpan = (
      <span
        style={{
          fontSize: m.labelFont,
          fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
          color: isCurrent ? ACCENT : isFuture ? LABEL_INACTIVE : ACCENT,
          textAlign: "center",
          lineHeight: 1.25,
          maxWidth: "100%",
          padding: "0 2px",
          overflow: "hidden",
          maxHeight: m.labelMaxHeight,
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
          minHeight: m.connectorRowMinHeight,
          marginBottom: m.rowMarginBottom,
        }}
      >
        <div
          aria-hidden
          style={{
            flex: 1,
            height: m.trackHeight,
            minWidth: m.trackMinWidth,
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
            height: m.trackHeight,
            minWidth: m.trackMinWidth,
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
        data-wizard-step={s.stepNumber}
        data-wizard-current-step={isCurrent ? "true" : "false"}
        style={{
          flex: "0 0 auto",
          width: m.colWidth,
          minWidth: m.colWidth,
          maxWidth: m.colWidth,
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

  const segments = steps.map((s, gi) => renderStepColumn(s, gi));

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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: centerOuter,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            width: capScrollViewport ? trackOuterMaxCss : "100%",
            maxWidth: trackOuterMaxCss,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: capScrollViewport ? "1 1 auto" : "1 1 0%",
              minWidth: 0,
              width: capScrollViewport ? undefined : "100%",
              maxWidth: scrollPaneMaxCss,
              boxSizing: "border-box",
            }}
          >
            <div
              ref={scrollRef}
              className="wizard-stepper-scroll"
              style={{
                width: "100%",
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: 6,
                paddingLeft: !canScrollRight && canScrollLeft ? STEP_SCROLL_START_GUTTER : 0,
                paddingRight: canScrollRight ? STEP_SCROLL_END_GUTTER : 0,
                boxSizing: "border-box",
                overscrollBehaviorX: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: m.gap,
                  width: "max-content",
                }}
              >
                {segments}
              </div>
            </div>
            {!canScrollRight && canScrollLeft ? (
              <button
                type="button"
                aria-label="Scroll to previous steps"
                title="Previous steps"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  const delta = Math.min(360, Math.max(160, Math.floor(el.clientWidth * 0.5)));
                  el.scrollBy({ left: -delta, behavior: "smooth" });
                  window.setTimeout(() => updateScrollEdges(), 280);
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 32,
                  height: connectorBandHeight,
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: 0,
                  background:
                    "linear-gradient(270deg, transparent 0%, color-mix(in srgb, var(--color-surface, #fff) 75%, transparent) 38%, var(--color-surface, #fff) 72%)",
                  color: ACCENT,
                  cursor: "pointer",
                  boxShadow: "none",
                  zIndex: 2,
                  pointerEvents: "auto",
                }}
              >
                <Icons.ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
            {canScrollRight ? (
              <button
                type="button"
                aria-label="Scroll to more steps"
                title="More steps"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  const delta = Math.min(360, Math.max(160, Math.floor(el.clientWidth * 0.5)));
                  el.scrollBy({ left: delta, behavior: "smooth" });
                  window.setTimeout(() => updateScrollEdges(), 280);
                }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: 32,
                  height: connectorBandHeight,
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--color-surface, #fff) 75%, transparent) 38%, var(--color-surface, #fff) 72%)",
                  color: ACCENT,
                  cursor: "pointer",
                  boxShadow: "none",
                  zIndex: 2,
                  pointerEvents: "auto",
                }}
              >
                <Icons.ChevronRight size={20} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
