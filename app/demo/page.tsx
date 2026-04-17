"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AIPlan {
  audience: string;
  leads: string;
  sequence: string;
  safety: string;
  estimatedLeads: number;
  estimatedTime: string;
  confidence: number;
}

interface ProgressStep {
  completed: boolean;
  progress: number;
}

interface Progress {
  leads: ProgressStep;
  enriched: ProgressStep;
  verified: ProgressStep;
  segmented: ProgressStep;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string;
  color: string;
}

interface Slide {
  id: string;
  title: string;
  content: string;
  duration: number;
}

export default function DemoPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [goal, setGoal] = useState("");
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const [progress, setProgress] = useState<Progress>({
    leads: { completed: false, progress: 0 },
    enriched: { completed: false, progress: 0 },
    verified: { completed: false, progress: 0 },
    segmented: { completed: false, progress: 0 }
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  const exampleGoals = [
    "Get 30 demos with UAE real estate founders in 30 days",
    "Book 50 meetings with SaaS founders in the next 2 weeks",
    "Generate 100 qualified leads from fintech companies",
    "Close 10 deals with enterprise clients this quarter"
  ];

  const slides: Slide[] = [
    {
      id: 'goal-input',
      title: 'What do you want to achieve?',
      content: 'GoalInputSlide',
      duration: 0 // User controlled
    },
    {
      id: 'ai-analyzing',
      title: 'AI is analyzing your goal...',
      content: 'AnalyzingSlide',
      duration: 2000 // Auto-advance after 2s
    },
    {
      id: 'ai-plan',
      title: 'AI Generated Plan',
      content: 'PlanSlide',
      duration: 0 // User controlled
    },
    {
      id: 'data-prep',
      title: 'AI is preparing your data...',
      content: 'DataPrepSlide',
      duration: 8000 // Auto-advance after 8s
    },
    {
      id: 'launch-ready',
      title: 'Ready to Launch!',
      content: 'LaunchSlide',
      duration: 0 // User controlled
    },
    {
      id: 'inbox',
      title: 'Campaign Metrics',
      content: 'InboxSlide',
      duration: 0 // User controlled
    },
    {
      id: 'performance-summary',
      title: 'Performance Summary',
      content: 'PerformanceSummarySlide',
      duration: 0 // User controlled
    }
  ];

  const steps: Step[] = [
    {
      id: 'leads',
      title: 'Leads Added',
      description: 'Generating and importing leads from multiple sources',
      icon: 'users',
      details: '200 leads generated and imported',
      color: '#2563EB'
    },
    {
      id: 'enriched',
      title: 'Enriched',
      description: 'Adding company data, LinkedIn profiles, and tech stack',
      icon: 'search',
      details: 'Company data, LinkedIn profiles, tech stack',
      color: '#06B6D4'
    },
    {
      id: 'verified',
      title: 'Verified',
      description: 'Validating and verifying email addresses',
      icon: 'check',
      details: 'Email addresses validated and verified',
      color: '#4ecdc4'
    },
    {
      id: 'segmented',
      title: 'Segmented',
      description: 'AI scoring and auto-segmentation by engagement',
      icon: 'target',
      details: 'Auto-scored and segmented by engagement',
      color: '#ffa726'
    }
  ];

  // Auto-advance slides with duration
  useEffect(() => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData.duration > 0) {
      const timer = setTimeout(() => {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
        setSlideDirection('right');
      }, currentSlideData.duration);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
        nextSlide();
      } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide]);

  // Data prep progress animation
  useEffect(() => {
    if (currentSlide === 3) { // Data prep slide
      const startProgress = () => {
        // Step 1: Leads
        setTimeout(() => {
          animateProgress('leads', 100);
          setCurrentStep(1);
        }, 1000);

        // Step 2: Enriched
        setTimeout(() => {
          animateProgress('enriched', 100);
          setCurrentStep(2);
        }, 3000);

        // Step 3: Verified
        setTimeout(() => {
          animateProgress('verified', 100);
          setCurrentStep(3);
        }, 5000);

        // Step 4: Segmented
        setTimeout(() => {
          animateProgress('segmented', 100);
          setCurrentStep(4);
          setIsComplete(true);
        }, 7000);
      };

      startProgress();
    }
  }, [currentSlide]);

  const animateProgress = (stepId: keyof Progress, targetProgress: number) => {
    const duration = 1500;
    const startTime = Date.now();
    const startProgress = progress[stepId].progress;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const currentProgress = startProgress + (targetProgress - startProgress) * progressRatio;

      setProgress(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          progress: currentProgress,
          completed: currentProgress >= 100
        }
      }));

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const nextSlide = () => {
    setSlideDirection('right');
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  };

  const prevSlide = () => {
    setSlideDirection('left');
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  const goToSlide = (index: number) => {
    setSlideDirection(index > currentSlide ? 'right' : 'left');
    setCurrentSlide(index);
  };

  const handleGoalSubmit = () => {
    if (!goal.trim()) return;
    setIsAnalyzing(true);
    setCurrentSlide(1); // Move to analyzing slide
    setSlideDirection('right');

    setTimeout(() => {
      // Simulate AI analysis and plan creation
      const plan = generateAIPlan(goal);
      setAiPlan(plan);
      setIsAnalyzing(false);
      setCurrentSlide(2); // Move to plan slide
    }, 2000);
  };

  const generateAIPlan = (userGoal: string): AIPlan => {
    const goalLower = userGoal.toLowerCase();
    
    let audience = "Tech founders · 10-500 employees";
    let leads = "Generate + Import from CRM";
    let sequence = "Email → LinkedIn → Email bump → Call";
    let safety = "Throttling, quiet hours, stop on reply";

    if (goalLower.includes("real estate") || goalLower.includes("uae")) {
      audience = "UAE · Real estate founders · 5-200 employees";
      sequence = "Email → WhatsApp → Email bump → Call";
    } else if (goalLower.includes("saas")) {
      audience = "SaaS founders · 20-1000 employees";
      sequence = "LinkedIn → Email → Call → Follow-up";
    } else if (goalLower.includes("fintech")) {
      audience = "Fintech founders · 50-500 employees";
      sequence = "Email → LinkedIn → WhatsApp → Call";
    } else if (goalLower.includes("enterprise")) {
      audience = "Enterprise decision makers · 1000+ employees";
      sequence = "Email → LinkedIn → Call → Executive outreach";
    }

    return {
      audience,
      leads,
      sequence,
      safety,
      estimatedLeads: Math.floor(Math.random() * 500) + 100,
      estimatedTime: "2-4 weeks",
      confidence: Math.floor(Math.random() * 20) + 80
    };
  };

  const handleApprove = () => {
    setCurrentSlide(3); // Move to data prep slide
    setSlideDirection('right');
  };

  const handleLaunch = () => {
    setCurrentSlide(5); // Move to metrics slide
    setSlideDirection('right');
  };

  const renderSlideContent = () => {
    const slide = slides[currentSlide];
    
    switch (slide.content) {
      case 'GoalInputSlide':
        return <GoalInputSlide goal={goal} setGoal={setGoal} onSubmit={handleGoalSubmit} exampleGoals={exampleGoals} />;
      case 'AnalyzingSlide':
        return <AnalyzingSlide />;
      case 'PlanSlide':
        return <PlanSlide aiPlan={aiPlan} onApprove={handleApprove} />;
      case 'DataPrepSlide':
        return <DataPrepSlide steps={steps} progress={progress} currentStep={currentStep} isComplete={isComplete} />;
      case 'LaunchSlide':
        return <LaunchSlide onLaunch={handleLaunch} />;
      case 'InboxSlide':
        return <InboxSlide />;
      case 'PerformanceSummarySlide':
        return <PerformanceSummarySlide />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-canvas, var(--color-background, #f8fafc))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Progress Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: 4,
          background: "#e2e8f0",
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: `${((currentSlide + 1) / slides.length) * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Slide Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px clamp(16px, 4vw, 48px) 100px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            opacity: 1,
            transform: "translateX(0)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: slideDirection === "right" ? "slideInRight 0.55s ease-out" : "slideInLeft 0.55s ease-out",
          }}
        >
          {renderSlideContent()}
        </div>
      </div>

      {/* Slide Navigation Dots */}
      <div
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 10,
          zIndex: 100,
          padding: "10px 16px",
          borderRadius: 9999,
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
        }}
      >
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            title={`Go to slide ${index + 1}`}
            onClick={() => goToSlide(index)}
            style={{
              width: currentSlide === index ? 22 : 10,
              height: 10,
              borderRadius: 9999,
              background: currentSlide === index ? "#4f46e5" : "#cbd5e1",
              border: "none",
              cursor: "pointer",
              transition: "all 0.25s ease",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={prevSlide}
        disabled={currentSlide === 0}
        style={{
          position: "fixed",
          left: "clamp(12px, 3vw, 36px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "50%",
          width: 48,
          height: 48,
          color: "#334155",
          fontSize: 20,
          cursor: currentSlide === 0 ? "not-allowed" : "pointer",
          opacity: currentSlide === 0 ? 0.4 : 1,
          zIndex: 100,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        ←
      </button>

      <button
        type="button"
        aria-label="Next slide"
        onClick={nextSlide}
        disabled={currentSlide === slides.length - 1}
        style={{
          position: "fixed",
          right: "clamp(12px, 3vw, 36px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "50%",
          width: 48,
          height: 48,
          color: "#334155",
          fontSize: 20,
          cursor: currentSlide === slides.length - 1 ? "not-allowed" : "pointer",
          opacity: currentSlide === slides.length - 1 ? 0.4 : 1,
          zIndex: 100,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        →
      </button>

      {/* Slide Counter */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          background: "#fff",
          borderRadius: 9999,
          padding: "8px 14px",
          color: "#475569",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 100,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
        }}
      >
        {currentSlide + 1} / {slides.length}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Individual Slide Components
const GoalInputSlide = ({ goal, setGoal, onSubmit, exampleGoals }: {
  goal: string;
  setGoal: (goal: string) => void;
  onSubmit: () => void;
  exampleGoals: string[];
}) => (
  <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 9999,
        background: "#eef2ff",
        border: "1px solid #c7d2fe",
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", letterSpacing: "0.04em" }}>INTERACTIVE DEMO</span>
    </div>
    <h1
      style={{
        fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
        fontWeight: 800,
        margin: "0 0 12px 0",
        color: "var(--color-text, #0f172a)",
        letterSpacing: "-0.03em",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      Outriva demo
    </h1>
    <p style={{ fontSize: 16, color: "var(--color-text-muted, #64748b)", margin: "0 0 28px 0", lineHeight: 1.55 }}>
      Experience how a goal becomes a plan, then a live pipeline — use arrows or dots to move between steps.
    </p>

    <div
      style={{
        background: "var(--color-surface, #ffffff)",
        borderRadius: 20,
        padding: "clamp(24px, 4vw, 36px)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
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
          background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <h2
          style={{
            fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)",
            fontWeight: 700,
            margin: "0 0 14px 0",
            color: "var(--color-text, #0f172a)",
            textAlign: "center",
          }}
        >
          What do you want to achieve?
        </h2>

        <div style={{ marginBottom: 20 }}>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Get 30 demos with UAE real estate founders in 30 days"
            style={{
              width: "100%",
              minHeight: 120,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "var(--color-text, #0f172a)",
              fontSize: 15,
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>
            Try an example
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exampleGoals.map((example: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => setGoal(example)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#334155",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!goal.trim()}
          style={{
            background: !goal.trim() ? "#e2e8f0" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            border: "none",
            borderRadius: 12,
            padding: "14px 24px",
            color: !goal.trim() ? "#94a3b8" : "#ffffff",
            fontSize: 15,
            fontWeight: 600,
            cursor: !goal.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "0 auto",
            boxShadow: !goal.trim() ? "none" : "0 8px 24px rgba(79, 70, 229, 0.3)",
            transition: "transform 0.12s ease, box-shadow 0.12s ease",
            width: "100%",
            maxWidth: 320,
            justifyContent: "center",
            fontFamily: "inherit",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="10" rx="2" />
            <path d="M12 3v4M8 11h.01M16 11h.01M8 17a4 4 0 0 0 8 0" />
          </svg>
          Let AI build your plan
        </button>
      </div>
    </div>
  </div>
);

const AnalyzingSlide = () => (
  <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
    <div
      style={{
        background: "var(--color-surface, #ffffff)",
        borderRadius: 20,
        padding: "clamp(48px, 8vw, 80px) clamp(24px, 5vw, 48px)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
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
          background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px auto",
            boxShadow: "0 12px 40px rgba(79, 70, 229, 0.35)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(255, 255, 255, 0.35)",
              borderTopColor: "#ffffff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>

        <h2
          style={{
            fontSize: "clamp(1.35rem, 3vw, 1.75rem)",
            fontWeight: 800,
            margin: "0 0 12px 0",
            color: "var(--color-text, #0f172a)",
            letterSpacing: "-0.02em",
          }}
        >
          AI is analyzing your goal…
        </h2>
        <p style={{ fontSize: 16, color: "var(--color-text-muted, #64748b)", margin: "0 0 24px 0", lineHeight: 1.55 }}>
          We are shaping audience, channels, and pacing for your plan preview.
        </p>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: "14px 18px",
            border: "1px solid #e2e8f0",
            display: "inline-flex",
            maxWidth: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#4f46e5",
                flexShrink: 0,
                opacity: 0.85,
              }}
            />
            <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
              Analyzing audience patterns and optimal channels…
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PlanSlide = ({ aiPlan, onApprove }: {
  aiPlan: AIPlan | null;
  onApprove: () => void;
}) => {
  // Parse sequence into steps for better visualization
  const sequenceSteps = aiPlan?.sequence.split(' → ') || [];
  
  return (
    <div>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        margin: '0 0 16px 0',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        AI Generated Plan
      </h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Audience Card */}
        <div style={{
          background: 'rgba(37, 99, 235, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ 
            width: '56px', 
            height: '56px', 
            margin: '0 auto 16px auto',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #6B7FFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            margin: '0 0 12px 0',
            color: '#2563EB'
          }}>
            Audience
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-text)', 
            margin: '0 0 16px 0',
            lineHeight: '1.6',
            minHeight: '48px'
          }}>
            {aiPlan?.audience}
          </p>
          <div style={{
            background: 'rgba(37, 99, 235, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#2563EB',
            fontWeight: '600',
            display: 'inline-block'
          }}>
            {aiPlan?.estimatedLeads} estimated leads
          </div>
        </div>

        {/* Leads Card */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ 
            width: '56px', 
            height: '56px', 
            margin: '0 auto 16px auto',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06B6D4 0%, #C47FFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            margin: '0 0 12px 0',
            color: '#06B6D4'
          }}>
            Leads
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-text)', 
            margin: '0 0 16px 0',
            lineHeight: '1.6',
            minHeight: '48px'
          }}>
            {aiPlan?.leads}
          </p>
          <div style={{
            background: 'rgba(6, 182, 212, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#06B6D4',
            fontWeight: '600',
            display: 'inline-block'
          }}>
            AI will find & enrich
          </div>
        </div>

        {/* Sequence Card - Enhanced */}
        <div style={{
          background: 'rgba(78, 205, 196, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(78, 205, 196, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(78, 205, 196, 0.2) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ 
            width: '56px', 
            height: '56px', 
            margin: '0 auto 16px auto',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4ecdc4 0%, #6EDDD4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            margin: '0 0 20px 0',
            color: '#4ecdc4'
          }}>
            Sequence Timeline
          </h3>
          
          {/* Visual Sequence Steps */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px'
          }}>
            {sequenceSteps.map((step, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(78, 205, 196, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: '#4ecdc4',
                  fontWeight: '600',
                  border: '1px solid rgba(78, 205, 196, 0.4)',
                  whiteSpace: 'nowrap'
                }}>
                  {step}
                </div>
                {index < sequenceSteps.length - 1 && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
          
          <div style={{
            background: 'rgba(78, 205, 196, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#4ecdc4',
            fontWeight: '600',
            display: 'inline-block'
          }}>
            {aiPlan?.estimatedTime} timeline
          </div>
        </div>

        {/* Safety Card */}
        <div style={{
          background: 'rgba(255, 167, 38, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 167, 38, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(255, 167, 38, 0.2) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ 
            width: '56px', 
            height: '56px', 
            margin: '0 auto 16px auto',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ffa726 0%, #FFB84D 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 167, 38, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            margin: '0 0 12px 0',
            color: '#ffa726'
          }}>
            Safety
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-text)', 
            margin: '0 0 16px 0',
            lineHeight: '1.6',
            minHeight: '48px'
          }}>
            {aiPlan?.safety}
          </p>
          <div style={{
            background: 'rgba(255, 167, 38, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#ffa726',
            fontWeight: '600',
            display: 'inline-block'
          }}>
            {aiPlan?.confidence}% confidence
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onApprove}
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            border: 'none',
            borderRadius: '16px',
            padding: '20px 40px',
            color: '#000000',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.3)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Approve & Start Data Prep
        </button>
      </div>
    </div>
  );
};

const DataPrepSlide = ({ steps, progress, currentStep, isComplete }: {
  steps: Step[];
  progress: Progress;
  currentStep: number;
  isComplete: boolean;
}) => (
  <div>
    <h1 style={{ 
      fontSize: '32px', 
      fontWeight: '700', 
      margin: '0 0 16px 0',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>
      AI is preparing your campaign...
    </h1>
    <p style={{ 
      fontSize: '18px', 
      color: 'var(--color-text-muted)', 
      margin: '0 0 48px 0',
      textAlign: 'center'
    }}>
      Our AI is working hard to set up everything for your success
    </p>

    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      padding: '40px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {steps.map((step: Step, index: number) => {
        const stepProgress = progress[step.id as keyof Progress];
        const isActive = currentStep === index;
        const isCompleted = stepProgress.completed;
        const isUpcoming = currentStep < index;

        return (
          <div key={step.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: index < steps.length - 1 ? '32px' : '0',
            padding: '20px',
            borderRadius: '16px',
            background: isActive 
              ? 'rgba(37, 99, 235, 0.1)' 
              : isCompleted 
                ? 'rgba(78, 205, 196, 0.1)'
                : 'rgba(255, 255, 255, 0.02)',
            border: isActive 
              ? '1px solid rgba(37, 99, 235, 0.3)' 
              : isCompleted 
                ? '1px solid rgba(78, 205, 196, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.5s ease'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isCompleted 
                ? step.color
                : isActive 
                  ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}80 100%)`
                  : 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {isCompleted ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : isActive ? (
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '3px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', width: '32px', height: '32px' }}>
                  {step.icon === 'users' && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  )}
                  {step.icon === 'search' && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  )}
                  {step.icon === 'check' && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {step.icon === 'target' && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="6"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  )}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: isCompleted ? step.color : 'var(--color-text)'
              }}>
                {step.title}
              </h3>
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--color-text-muted)', 
                margin: '0 0 12px 0',
                lineHeight: '1.5'
              }}>
                {step.description}
              </p>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                color: 'var(--color-text)',
                display: 'inline-block'
              }}>
                {step.details}
              </div>
            </div>

            <div style={{
              width: '120px',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${stepProgress.progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${step.color} 0%, ${step.color}80 100%)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const LaunchSlide = ({ onLaunch }: {
  onLaunch: () => void;
}) => {
  const launchSettings = [
    { 
      icon: 'send', 
      label: 'Send to 200/day', 
      description: 'Daily sending limit',
      color: '#2563EB'
    },
    { 
      icon: 'clock', 
      label: 'Start today 10:00', 
      description: 'Launch time',
      color: '#06B6D4'
    },
    { 
      icon: 'stop', 
      label: 'Stop on reply', 
      description: 'Auto-stop when replied',
      color: '#4ecdc4'
    },
    { 
      icon: 'test', 
      label: 'Dry-run to me first (5 contacts)', 
      description: 'Test before full launch',
      color: '#ffa726'
    }
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
        borderRadius: '24px',
        padding: '60px 48px',
        border: '1px solid rgba(37, 99, 235, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            width: '100px',
            height: '100px',
            margin: '0 auto 24px auto',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)'
          }}>
            🚀
          </div>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '700', 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Ready to Launch!
          </h1>
          <p style={{ 
            fontSize: '20px', 
            color: 'var(--color-text-muted)', 
            margin: '0 0 40px 0' 
          }}>
            Your campaign is fully prepared and ready to go live
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '40px',
            textAlign: 'left',
            maxWidth: '700px',
            margin: '0 auto 40px auto',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              margin: '0 0 28px 0',
              color: 'var(--color-text)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              position: 'relative',
              zIndex: 1
            }}>
              <span style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                </svg>
              </span>
              Launch Settings
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '16px',
              position: 'relative',
              zIndex: 1
            }}>
              {launchSettings.map((setting, index) => (
                <div key={index} style={{
                  background: `linear-gradient(135deg, rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.15) 0%, rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.08) 100%)`,
                  borderRadius: '16px',
                  padding: '18px',
                  border: `1px solid rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.4)`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 4px 12px rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.15)`,
                  backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 20px rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.25)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(${setting.color === '#2563EB' ? '124, 58, 237' : setting.color === '#06B6D4' ? '169, 76, 255' : setting.color === '#4ecdc4' ? '78, 205, 196' : '255, 167, 38'}, 0.15)`;
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {setting.icon === 'send' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                    {setting.icon === 'clock' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    )}
                    {setting.icon === 'stop' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                      </svg>
                    )}
                    {setting.icon === 'test' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        style={{ 
                          transform: 'scale(1.2)',
                          cursor: 'pointer'
                        }} 
                      />
                      <span style={{ 
                        color: 'var(--color-text)', 
                        fontSize: '15px',
                        fontWeight: '600'
                      }}>
                        {setting.label}
                      </span>
                    </div>
                    <p style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '12px',
                      margin: '4px 0 0 28px',
                      lineHeight: '1.4'
                    }}>
                      {setting.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onLaunch}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
              border: 'none',
              borderRadius: '20px',
              padding: '20px 40px',
              color: '#000000',
              fontSize: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0 auto',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
            Launch Campaign
          </button>
        </div>
      </div>
    </div>
  );
};

const InboxSlide = () => {
  const metrics = [
    {
      icon: 'send',
      label: 'Sent',
      value: '1,247',
      description: 'Total messages sent',
      color: '#2563EB',
      trend: '+12%'
    },
    {
      icon: 'mail',
      label: 'Delivered',
      value: '1,198',
      description: 'Successfully delivered',
      color: '#06B6D4',
      trend: '96.1%'
    },
    {
      icon: 'eye',
      label: 'Opened',
      value: '342',
      description: 'Emails opened',
      color: '#4ecdc4',
      trend: '28.5%'
    },
    {
      icon: 'link',
      label: 'Clicked',
      value: '89',
      description: 'Links clicked',
      color: '#ffa726',
      trend: '7.4%'
    },
    {
      icon: 'message',
      label: 'Replied',
      value: '142',
      description: 'Total replies received',
      color: '#ef5350',
      trend: '11.4%'
    },
    {
      icon: 'clock',
      label: 'Avg Response',
      value: '2.3h',
      description: 'Average reply time',
      color: '#ab47bc',
      trend: 'Fast'
    }
  ];

  return (
    <div>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        margin: '0 0 16px 0',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Campaign Metrics
      </h1>
      <p style={{ 
        fontSize: '18px', 
        color: 'var(--color-text-muted)', 
        margin: '0 0 48px 0',
        textAlign: 'center'
      }}>
        Real-time performance tracking and analytics
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Metrics Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '32px'
        }}>
          {metrics.map((metric, index) => (
            <div key={index} style={{
              background: `rgba(${metric.color === '#2563EB' ? '124, 58, 237' : metric.color === '#06B6D4' ? '169, 76, 255' : metric.color === '#4ecdc4' ? '78, 205, 196' : metric.color === '#ffa726' ? '255, 167, 38' : metric.color === '#ef5350' ? '239, 83, 80' : '171, 71, 188'}, 0.1)`,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid rgba(${metric.color === '#2563EB' ? '124, 58, 237' : metric.color === '#06B6D4' ? '169, 76, 255' : metric.color === '#4ecdc4' ? '78, 205, 196' : metric.color === '#ffa726' ? '255, 167, 38' : metric.color === '#ef5350' ? '239, 83, 80' : '171, 71, 188'}, 0.3)`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '60px',
                height: '60px',
                background: `radial-gradient(circle, rgba(${metric.color === '#2563EB' ? '124, 58, 237' : metric.color === '#06B6D4' ? '169, 76, 255' : metric.color === '#4ecdc4' ? '78, 205, 196' : metric.color === '#ffa726' ? '255, 167, 38' : metric.color === '#ef5350' ? '239, 83, 80' : '171, 71, 188'}, 0.2) 0%, transparent 70%)`,
                borderRadius: '50%'
              }} />
              <div style={{ 
                width: '48px',
                height: '48px',
                marginBottom: '12px',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metric.color
              }}>
                {metric.icon === 'send' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
                {metric.icon === 'mail' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                )}
                {metric.icon === 'eye' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
                {metric.icon === 'link' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                )}
                {metric.icon === 'message' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                )}
                {metric.icon === 'clock' && (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: metric.color,
                marginBottom: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                {metric.value}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: 'var(--color-text)',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1
              }}>
                {metric.label}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--color-text-muted)',
                marginBottom: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                {metric.description}
              </div>
              <div style={{
                background: `rgba(${metric.color === '#2563EB' ? '124, 58, 237' : metric.color === '#06B6D4' ? '169, 76, 255' : metric.color === '#4ecdc4' ? '78, 205, 196' : metric.color === '#ffa726' ? '255, 167, 38' : metric.color === '#ef5350' ? '239, 83, 80' : '171, 71, 188'}, 0.2)`,
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                color: metric.color,
                fontWeight: '600',
                display: 'inline-block',
                position: 'relative',
                zIndex: 1
              }}>
                {metric.trend}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerformanceSummarySlide = () => {
  return (
    <div>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        margin: '0 0 16px 0',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Campaign Performance Summary
      </h1>
      <p style={{ 
        fontSize: '18px', 
        color: 'var(--color-text-muted)', 
        margin: '0 0 48px 0',
        textAlign: 'center'
      }}>
        Key metrics and insights from your campaign
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Summary Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          marginBottom: '32px',
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-30%',
            width: '150%',
            height: '150%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)'
            }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
            <h3 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              margin: 0,
              color: 'var(--color-text)',
              background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Campaign Performance Summary
            </h3>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '20px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {[
              { value: '1,247', label: 'Messages Sent', color: '#2563EB', icon: 'send' },
              { value: '28.5%', label: 'Open Rate', color: '#4ecdc4', icon: 'eye' },
              { value: '11.4%', label: 'Reply Rate', color: '#ef5350', icon: 'message' },
              { value: '7.4%', label: 'Click Rate', color: '#ffa726', icon: 'link' }
            ].map((item, index) => (
              <div key={index} style={{
                background: `linear-gradient(135deg, rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.15) 0%, rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.08) 100%)`,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.3)`,
                boxShadow: `0 4px 12px rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.15)`,
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 20px rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.25)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(${item.color === '#2563EB' ? '124, 58, 237' : item.color === '#4ecdc4' ? '78, 205, 196' : item.color === '#ef5350' ? '239, 83, 80' : '255, 167, 38'}, 0.15)`;
              }}>
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color
                }}>
                  {item.icon === 'send' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                  {item.icon === 'eye' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                  {item.icon === 'message' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  )}
                  {item.icon === 'link' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  )}
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: item.color, 
                  marginBottom: '6px',
                  background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {item.value}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--color-text-muted)',
                  fontWeight: '500'
                }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Complete Message */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          borderRadius: '20px',
          padding: '32px',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
          <div style={{ 
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
            position: 'relative',
            zIndex: 1
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <p style={{ 
            fontSize: '18px', 
            color: 'var(--color-text)', 
            margin: '0 0 12px 0',
            fontWeight: '700',
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Demo Complete!
          </p>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-muted)', 
            margin: 0,
            lineHeight: '1.7',
            position: 'relative',
            zIndex: 1,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            You've experienced the full Outriva workflow! In production, this dashboard shows real-time metrics 
            from your actual campaigns across Email, WhatsApp, and LinkedIn channels.
          </p>
        </div>
      </div>
    </div>
  );
};