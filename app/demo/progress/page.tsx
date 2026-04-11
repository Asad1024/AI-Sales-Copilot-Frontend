"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoProgressPage() {
  const [progress, setProgress] = useState({
    leads: { completed: false, progress: 0 },
    enriched: { completed: false, progress: 0 },
    verified: { completed: false, progress: 0 },
    segmented: { completed: false, progress: 0 }
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  const steps: Array<{
    id: 'leads' | 'enriched' | 'verified' | 'segmented';
    title: string;
    description: string;
    icon: string;
    details: string;
    color: string;
  }> = [
    {
      id: 'leads',
      title: 'Leads Added',
      description: 'Generating and importing leads from multiple sources',
      icon: '👥',
      details: '200 leads generated and imported',
      color: '#7C3AED'
    },
    {
      id: 'enriched',
      title: 'Enriched',
      description: 'Adding company data, LinkedIn profiles, and tech stack',
      icon: '🔍',
      details: 'Company data, LinkedIn profiles, tech stack',
      color: '#A94CFF'
    },
    {
      id: 'verified',
      title: 'Verified',
      description: 'Validating and verifying email addresses',
      icon: '✅',
      details: 'Email addresses validated and verified',
      color: '#4ecdc4'
    },
    {
      id: 'segmented',
      title: 'Segmented',
      description: 'AI scoring and auto-segmentation by engagement',
      icon: '🎯',
      details: 'Auto-scored and segmented by engagement',
      color: '#ffa726'
    }
  ];

  useEffect(() => {
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
  }, []);

  const animateProgress = (stepId: 'leads' | 'enriched' | 'verified' | 'segmented', targetProgress: number) => {
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

  const handleLaunch = () => {
    router.push('/demo/inbox');
  };

  const handleBack = () => {
    router.push('/demo');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--color-background)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '700', 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            AI is preparing your campaign...
          </h1>
          <p style={{ 
            fontSize: '20px', 
            color: 'var(--color-text-muted)', 
            margin: '0 0 32px 0' 
          }}>
            Our AI is working hard to set up everything for your success
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '32px'
        }}>
          {steps.map((step, index) => {
            const stepProgress = progress[step.id];
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
                  ? 'rgba(124, 58, 237, 0.1)' 
                  : isCompleted 
                    ? 'rgba(78, 205, 196, 0.1)'
                    : 'rgba(255, 255, 255, 0.02)',
                border: isActive 
                  ? '1px solid rgba(124, 58, 237, 0.3)' 
                  : isCompleted 
                    ? '1px solid rgba(78, 205, 196, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.5s ease'
              }}>
                {/* Step Icon */}
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
                    <span style={{ color: '#000000', fontSize: '32px' }}>✓</span>
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
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '32px' }}>
                      {step.icon}
                    </span>
                  )}
                  
                  {/* Progress Ring */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '-4px',
                      right: '-4px',
                      bottom: '-4px',
                      borderRadius: '50%',
                      border: '4px solid transparent',
                      borderTop: `4px solid ${step.color}`,
                      animation: 'spin 2s linear infinite'
                    }} />
                  )}
                </div>

                {/* Step Content */}
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

                {/* Progress Bar */}
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

        {/* Launch Section */}
        {isComplete && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              margin: '0 0 16px 0',
              color: 'var(--color-text)'
            }}>
              🚀 Ready to Launch!
            </h2>
            <p style={{ 
              fontSize: '18px', 
              color: 'var(--color-text-muted)', 
              margin: '0 0 32px 0' 
            }}>
              Your campaign is fully prepared and ready to go live
            </p>

            {/* Launch Options */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 20px 0',
                color: 'var(--color-text)',
                textAlign: 'center'
              }}>
                Launch Settings
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                  <span style={{ color: 'var(--color-text)', fontSize: '14px' }}>
                    Send to 200/day
                  </span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                  <span style={{ color: 'var(--color-text)', fontSize: '14px' }}>
                    Start today 10:00
                  </span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                  <span style={{ color: 'var(--color-text)', fontSize: '14px' }}>
                    Stop on reply
                  </span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                  <span style={{ color: 'var(--color-text)', fontSize: '14px' }}>
                    Dry-run to me first (5 contacts)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleLaunch}
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
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
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
                }}
              >
                🚀 Launch Campaign
              </button>
              
              <button
                onClick={handleBack}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '20px 40px',
                  color: 'var(--color-text)',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                ← Back to Plan
              </button>
            </div>
          </div>
        )}

        {/* Demo Mode Notice */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-muted)', 
            margin: 0 
          }}>
            🎭 <strong>Demo Mode:</strong> This progress simulation shows how AI would prepare your campaign. 
            In production, this process would take 2-5 minutes depending on lead volume.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
