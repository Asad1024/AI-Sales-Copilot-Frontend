"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DASHBOARD_TOUR_START_EVENT } from "@/lib/dashboardTour";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void;
}

interface ProductTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

const ACCENT = "#4F46E5";
const ACCENT_SOFT = "#6366F1";
const RING = "rgba(79, 70, 229, 0.45)";

export default function ProductTour({ steps, onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const completeTour = useCallback(() => {
    localStorage.setItem("sparkai:tour_completed", "true");
    setIsActive(false);
    setTargetRect(null);
    onComplete?.();
  }, [onComplete]);

  const showStep = useCallback(
    (stepIndex: number) => {
      const list = stepsRef.current;
      if (stepIndex >= list.length) {
        completeTour();
        return;
      }

      const step = list[stepIndex];
      if (step.action) {
        step.action();
      }

      setTimeout(
        () => {
          if (step.target) {
            const element = document.querySelector(step.target);
            if (element) {
              setTargetRect(element.getBoundingClientRect());
            } else {
              setTargetRect(null);
            }
          } else {
            setTargetRect(null);
          }
          setCurrentStep(stepIndex);
        },
        step.action ? 300 : 0
      );
    },
    [completeTour]
  );

  const skipTour = useCallback(() => {
    localStorage.setItem("sparkai:tour_completed", "true");
    setIsActive(false);
    setTargetRect(null);
    onSkip?.();
  }, [onSkip]);

  const startTour = useCallback(() => {
    setIsActive(true);
    showStep(0);
  }, [showStep]);

  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("sparkai:tour_completed");
    if (!hasSeenTour) {
      startTourRef.current();
    }
  }, []);

  useEffect(() => {
    const onReplay = () => startTour();
    window.addEventListener(DASHBOARD_TOUR_START_EVENT, onReplay);
    return () => window.removeEventListener(DASHBOARD_TOUR_START_EVENT, onReplay);
  }, [startTour]);

  useEffect(() => {
    if (!isActive) return;
    const updateRect = () => {
      const step = stepsRef.current[currentStep];
      if (!step?.target) {
        setTargetRect(null);
        return;
      }
      const element = document.querySelector(step.target);
      setTargetRect(element ? element.getBoundingClientRect() : null);
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isActive, currentStep]);

  const nextStep = () => {
    showStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  };

  if (!isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const position = step.position || "bottom";

  return (
    <>
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(5px)",
          zIndex: 9998,
          pointerEvents: "auto",
        }}
        onClick={skipTour}
      >
        {targetRect ? (
          <div
            style={{
              position: "absolute",
              left: `${targetRect.left}px`,
              top: `${targetRect.top}px`,
              width: `${targetRect.width}px`,
              height: `${targetRect.height}px`,
              borderRadius: 12,
              border: `2px solid ${ACCENT}`,
              boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.72), 0 0 0 4px ${RING}, 0 8px 32px rgba(79, 70, 229, 0.25)`,
              pointerEvents: "none",
              animation: "productTourPulse 2.2s ease-in-out infinite",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          ...(targetRect
            ? position === "bottom"
              ? {
                  top: `${targetRect.bottom + 16}px`,
                  left: `${targetRect.left + targetRect.width / 2}px`,
                  transform: "translateX(-50%)",
                }
              : position === "top"
                ? {
                    bottom: `${window.innerHeight - targetRect.top + 16}px`,
                    left: `${targetRect.left + targetRect.width / 2}px`,
                    transform: "translateX(-50%)",
                  }
                : position === "right"
                  ? {
                      left: `${targetRect.right + 16}px`,
                      top: `${targetRect.top + targetRect.height / 2}px`,
                      transform: "translateY(-50%)",
                    }
                  : position === "left"
                    ? {
                        right: `${window.innerWidth - targetRect.left + 16}px`,
                        top: `${targetRect.top + targetRect.height / 2}px`,
                        transform: "translateY(-50%)",
                      }
                    : {
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
          maxWidth: 400,
          minWidth: 300,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--color-surface, #ffffff)",
            borderRadius: 14,
            padding: "22px 22px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(79, 70, 229, 0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`,
            }}
          />

          <div style={{ marginBottom: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 8, letterSpacing: "0.04em" }}>
              Step {currentStep + 1} of {steps.length}
            </div>
            <div
              style={{
                height: 4,
                background: "#EEF2FF",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`,
                  transition: "width 0.25s ease",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 8px 0",
              color: "var(--color-text, #0F172A)",
              letterSpacing: "-0.02em",
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          >
            {step.title}
          </h3>

          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-muted, #64748B)",
              margin: "0 0 20px 0",
              lineHeight: 1.55,
            }}
          >
            {step.description}
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={skipTour}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Skip
            </button>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={nextStep}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                border: "none",
                background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
              }}
            >
              {currentStep === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes productTourPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.88;
          }
        }
      `}</style>
    </>
  );
}
