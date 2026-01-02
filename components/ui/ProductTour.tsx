"use client";
import { useState, useEffect, useRef } from "react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void; // Action to perform before showing step
}

interface ProductTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function ProductTour({ steps, onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("sparkai:tour_completed");
    if (!hasSeenTour) {
      setIsActive(true);
      showStep(0);
    }
  }, []);

  const showStep = (stepIndex: number) => {
    if (stepIndex >= steps.length) {
      completeTour();
      return;
    }

    const step = steps[stepIndex];
    
    // Perform action if specified
    if (step.action) {
      step.action();
    }

    // Wait for DOM update if action was performed
    setTimeout(() => {
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
      setCurrentStep(stepIndex);
    }, step.action ? 300 : 0);
  };

  const nextStep = () => {
    showStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem("sparkai:tour_completed", "true");
    setIsActive(false);
    setTargetRect(null);
    if (onComplete) onComplete();
  };

  const skipTour = () => {
    localStorage.setItem("sparkai:tour_completed", "true");
    setIsActive(false);
    setTargetRect(null);
    if (onSkip) onSkip();
  };

  if (!isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const position = step.position || "bottom";

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          pointerEvents: "auto",
        }}
        onClick={skipTour}
      >
        {/* Spotlight on target element */}
        {targetRect && (
          <div
            style={{
              position: "absolute",
              left: `${targetRect.left}px`,
              top: `${targetRect.top}px`,
              width: `${targetRect.width}px`,
              height: `${targetRect.height}px`,
              borderRadius: "12px",
              border: "3px solid #4C67FF",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 20px rgba(76, 103, 255, 0.5)",
              pointerEvents: "none",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          ...(targetRect
            ? position === "bottom"
              ? {
                  top: `${targetRect.bottom + 20}px`,
                  left: `${targetRect.left + targetRect.width / 2}px`,
                  transform: "translateX(-50%)",
                }
              : position === "top"
              ? {
                  bottom: `${window.innerHeight - targetRect.top + 20}px`,
                  left: `${targetRect.left + targetRect.width / 2}px`,
                  transform: "translateX(-50%)",
                }
              : position === "right"
              ? {
                  left: `${targetRect.right + 20}px`,
                  top: `${targetRect.top + targetRect.height / 2}px`,
                  transform: "translateY(-50%)",
                }
              : position === "left"
              ? {
                  right: `${window.innerWidth - targetRect.left + 20}px`,
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
          maxWidth: "400px",
          minWidth: "320px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "16px",
            padding: "24px",
            border: "2px solid #4C67FF",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            position: "relative",
          }}
        >
          {/* Progress indicator */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
              Step {currentStep + 1} of {steps.length}
            </div>
            <div
              style={{
                height: "4px",
                background: "rgba(76, 103, 255, 0.2)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "700",
              margin: "0 0 8px 0",
              color: "var(--color-text)",
            }}
          >
            {step.title}
          </h3>

          {/* Description */}
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-muted)",
              margin: "0 0 24px 0",
              lineHeight: "1.5",
            }}
          >
            {step.description}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={skipTour}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Skip Tour
            </button>
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-secondary)",
                  color: "var(--color-text)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                color: "#000",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}

