"use client";
import React from "react";

interface EnrichmentLoaderProps {
  phase: 'validation' | 'enrichment' | 'phone_enrichment' | 'complete';
  progress: number;
  message: string;
  onComplete?: () => void;
}

export default function EnrichmentLoader({ phase, progress, message, onComplete }: EnrichmentLoaderProps) {
  React.useEffect(() => {
    if (phase === 'complete' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const getPhaseIcon = () => {
    switch (phase) {
      case 'validation':
        return '🔍';
      case 'enrichment':
        return '✨';
      case 'phone_enrichment':
        return '📞';
      case 'complete':
        return '✅';
      default:
        return '⏳';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'validation':
        return '#7C3AED';
      case 'enrichment':
        return '#A94CFF';
      case 'phone_enrichment':
        return '#FF6B35';
      case 'complete':
        return '#4CAF50';
      default:
        return '#888';
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes wave {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(5deg); }
          66% { transform: translateY(-5px) rotate(-5deg); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: var(--progress-width); }
        }
        @keyframes checkmark {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
      
      <div 
        style={{ 
          position:'fixed', 
          inset:0, 
          background:'rgba(0,0,0,.85)', 
          zIndex:3000, 
          display:'flex', 
          alignItems:'center', 
          justifyContent:'center', 
          padding:20,
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        <div 
          style={{ 
            width:'min(600px, 90vw)', 
            background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
            border:'2px solid rgba(124, 58, 237, 0.4)', 
            borderRadius:24, 
            padding:0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124, 58, 237, 0.2)',
            animation: 'slideUp 0.4s ease-out',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Animated background particles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
                         radial-gradient(circle at 80% 70%, rgba(169, 76, 255, 0.15) 0%, transparent 50%)`,
            animation: 'pulse 3s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${getPhaseColor()} 0%, ${phase === 'enrichment' ? '#A94CFF' : phase === 'complete' ? '#4CAF50' : '#7C3AED'} 100%)`,
            padding: '32px 40px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              animation: 'float 4s ease-in-out infinite'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: phase !== 'complete' ? 'pulse 2s ease-in-out infinite' : 'checkmark 0.5s ease-out'
              }}>
                {getPhaseIcon()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin:0, 
                  fontSize:24, 
                  fontWeight:800, 
                  color:'white', 
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  marginBottom: 4
                }}>
                  {phase === 'validation' ? 'Validating Leads' : 
                   phase === 'enrichment' ? 'Finding contact information...' : 
                   phase === 'phone_enrichment' ? 'Discovering phone numbers...' :
                   'Enrichment Complete!'}
                </h3>
                <p style={{ 
                  margin:0, 
                  fontSize:14, 
                  color:'rgba(255,255,255,0.9)', 
                  fontWeight:500 
                }}>
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '40px',
            background: 'var(--elev-bg)',
            position: 'relative'
          }}>
            {/* Phase Indicators */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: 32,
              position: 'relative'
            }}>
              {/* Phase 1: Finding contact information (Apollo) */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: phase === 'validation' || phase === 'enrichment'
                    ? `linear-gradient(135deg, ${getPhaseColor()} 0%, ${getPhaseColor()}80 100%)`
                    : phase === 'phone_enrichment' || phase === 'complete'
                    ? 'linear-gradient(135deg, #4CAF50 0%, #4CAF5080 100%)'
                    : 'rgba(128, 128, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: (phase === 'validation' || phase === 'enrichment') ? `0 4px 12px ${getPhaseColor()}40` : 'none',
                  animation: (phase === 'validation' || phase === 'enrichment') ? 'pulse 2s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {(phase === 'validation' || phase === 'enrichment') ? '🔍' : (phase === 'phone_enrichment' || phase === 'complete') ? '✅' : '○'}
                </div>
                <div style={{ 
                  marginTop: 12, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: phase === 'validation' || phase === 'enrichment' || phase === 'phone_enrichment' || phase === 'complete'
                    ? 'var(--color-text)' 
                    : 'var(--color-text-muted)',
                  textAlign: 'center'
                }}>
                  Finding contact...
                </div>
              </div>

              {/* Connection Line 1 */}
              <div style={{
                position: 'absolute',
                top: 24,
                left: '16.66%',
                width: '16.66%',
                height: 2,
                background: phase === 'phone_enrichment' || phase === 'complete'
                  ? 'linear-gradient(90deg, #4CAF50 0%, #4CAF50 100%)'
                  : 'rgba(128, 128, 128, 0.3)',
                zIndex: 0
              }} />

              {/* Phase 2: Verifying email addresses (Anymail Finder) */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: phase === 'phone_enrichment'
                    ? `linear-gradient(135deg, ${getPhaseColor()} 0%, ${getPhaseColor()}80 100%)`
                    : phase === 'complete'
                    ? 'linear-gradient(135deg, #4CAF50 0%, #4CAF5080 100%)'
                    : phase === 'enrichment'
                    ? 'rgba(128, 128, 128, 0.2)'
                    : 'rgba(128, 128, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: phase === 'phone_enrichment' ? `0 4px 12px ${getPhaseColor()}40` : 'none',
                  animation: phase === 'phone_enrichment' ? 'pulse 2s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {phase === 'phone_enrichment' ? '📧' : phase === 'complete' ? '✅' : '○'}
                </div>
                <div style={{ 
                  marginTop: 12, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: phase === 'phone_enrichment' || phase === 'complete'
                    ? 'var(--color-text)' 
                    : 'var(--color-text-muted)',
                  textAlign: 'center'
                }}>
                  Verifying emails...
                </div>
              </div>

              {/* Connection Line 2 */}
              <div style={{
                position: 'absolute',
                top: 24,
                right: '16.66%',
                width: '16.66%',
                height: 2,
                background: phase === 'complete'
                  ? 'linear-gradient(90deg, #4CAF50 0%, #4CAF50 100%)'
                  : 'rgba(128, 128, 128, 0.3)',
                zIndex: 0
              }} />

              {/* Phase 3: Discovering phone numbers (FullEnrich) */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: phase === 'phone_enrichment'
                    ? `linear-gradient(135deg, ${getPhaseColor()} 0%, ${getPhaseColor()}80 100%)`
                    : phase === 'complete'
                    ? 'linear-gradient(135deg, #4CAF50 0%, #4CAF5080 100%)'
                    : 'rgba(128, 128, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: phase === 'phone_enrichment' ? `0 4px 12px ${getPhaseColor()}40` : 'none',
                  animation: phase === 'phone_enrichment' ? 'pulse 2s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {phase === 'phone_enrichment' ? '📞' : phase === 'complete' ? '✅' : '○'}
                </div>
                <div style={{ 
                  marginTop: 12, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: phase === 'phone_enrichment' || phase === 'complete'
                    ? 'var(--color-text)' 
                    : 'var(--color-text-muted)',
                  textAlign: 'center'
                }}>
                  Discovering phones...
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: '100%',
                height: 8,
                background: 'rgba(128, 128, 128, 0.2)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getPhaseColor()} 0%, ${phase === 'enrichment' ? '#A94CFF' : phase === 'complete' ? '#4CAF50' : '#7C3AED'} 100%)`,
                  borderRadius: 4,
                  transition: 'width 0.5s ease-out',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite'
                  }} />
                </div>
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: 600,
                color: getPhaseColor(),
                textAlign: 'center'
              }}>
                {progress}%
              </div>
            </div>

            {/* Status Message */}
            <div style={{
              padding: '20px 24px',
              background: `rgba(${phase === 'complete' ? '76, 175, 80' : phase === 'enrichment' ? '169, 76, 255' : '124, 58, 237'}, 0.1)`,
              border: `1px solid rgba(${phase === 'complete' ? '76, 175, 80' : phase === 'enrichment' ? '169, 76, 255' : '124, 58, 237'}, 0.3)`,
              borderRadius: 16,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: 'var(--color-text)',
                fontWeight: 500
              }}>
                {message}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

