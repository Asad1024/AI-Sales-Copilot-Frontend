"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAIPlan } from "@/lib/flowClient";
import { useNotification } from "@/context/NotificationContext";

const progressSteps = [
  "Analyzing your goal...",
  "Finding relevant leads...",
  "Creating personalized sequence...",
  "Setting up safety measures...",
  "Generating AI plan..."
];

const goalTemplates = [
  {
    category: "SaaS Founders",
    goals: [
      "Get 50 demos with SaaS founders in 30 days",
      "Book 20 calls with B2B SaaS CEOs this month",
      "Generate 100 qualified leads from SaaS companies"
    ]
  },
  {
    category: "Enterprise Sales",
    goals: [
      "Close 5 enterprise deals worth $50k+ each",
      "Get 10 meetings with Fortune 500 CTOs",
      "Generate 200 enterprise leads in Q4"
    ]
  },
  {
    category: "Event Promotion",
    goals: [
      "Sell 100 tickets to our AI webinar",
      "Get 50 RSVPs for our product launch event",
      "Promote conference to 1000 tech professionals"
    ]
  },
  {
    category: "Re-engagement",
    goals: [
      "Reactivate 500 dormant leads from CRM",
      "Re-engage 200 old customers with new offers",
      "Win back 50 churned customers this quarter"
    ]
  }
];

const quickActions = [
  {
    title: "Get 50 demos with SaaS founders",
    description: "AI will find and engage SaaS founders",
  },
  {
    title: "Re-engage old CRM leads",
    description: "Reactivate dormant leads with AI sequences",
  },
  {
    title: "Launch webinar promotion",
    description: "Promote your AI webinar to target audience",
  },
  {
    title: "Sell to EU marketing directors",
    description: "Target European marketing decision makers",
  }
];

export function AICommandCenter() {
  const router = useRouter();
  const { showWarning } = useNotification();
  const [quickGoal, setQuickGoal] = useState("");
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [goalHistory, setGoalHistory] = useState<string[]>([]);
  const [progress, setProgress] = useState({ step: 0, message: "", isActive: false });
  const [goalValidation, setGoalValidation] = useState<{ score: number; suggestions: string[] }>({ score: 0, suggestions: [] });
  const [isListening, setIsListening] = useState(false);
  const [quickLink, setQuickLink] = useState("");
  const [backlog, setBacklog] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [currentInsight, setCurrentInsight] = useState(0);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (aiInsights.length > 0) {
        setCurrentInsight((prev) => (prev + 1) % aiInsights.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [aiInsights.length]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sparkai:goalHistory');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        setGoalHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error parsing goalHistory:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuickGoal(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const validateGoal = (goal: string) => {
    let score = 0;
    const suggestions: string[] = [];

    if (/\d+/.test(goal)) score += 20;
    else suggestions.push("Consider adding specific numbers (e.g., '50 demos')");

    if (/\d+\s*(days?|weeks?|months?|quarters?)/i.test(goal)) score += 20;
    else suggestions.push("Add a timeline (e.g., 'in 30 days')");

    if (/(founders?|CEOs?|CTOs?|managers?|directors?|professionals?)/i.test(goal)) score += 20;
    else suggestions.push("Specify your target audience (e.g., 'SaaS founders')");

    if (/(get|book|generate|close|sell|promote|reactivate)/i.test(goal)) score += 20;
    else suggestions.push("Use action words (get, book, generate, etc.)");

    if (/(email|linkedin|whatsapp|call|meeting|demo)/i.test(goal)) score += 20;
    else suggestions.push("Specify channels (email, LinkedIn, calls, etc.)");

    setGoalValidation({ score, suggestions });
  };

  useEffect(() => {
    if (quickGoal.trim()) {
      validateGoal(quickGoal);
    } else {
      setGoalValidation({ score: 0, suggestions: [] });
    }
  }, [quickGoal]);

  const hasNumber = /\d+/.test(quickGoal);
  const hasTimeline = /\d+\s*(days?|weeks?|months?|quarters?)/i.test(quickGoal);
  const hasAudience = /(founders?|CEOs?|CTOs?|managers?|directors?|professionals?)/i.test(quickGoal);
  const hasChannel = /(email|linkedin|whatsapp|call|meeting|demo)/i.test(quickGoal);

  const handleQuickGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoal.trim()) return;
    
    setIsSubmittingGoal(true);
    setProgress({ step: 0, message: progressSteps[0], isActive: true });
    
    const newHistory = [quickGoal, ...goalHistory.filter(g => g !== quickGoal)].slice(0, 5);
    setGoalHistory(newHistory);
    localStorage.setItem('sparkai:goalHistory', JSON.stringify(newHistory));

    for (let i = 0; i < progressSteps.length; i++) {
      setProgress({ step: i, message: progressSteps[i], isActive: true });
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const data = await createAIPlan(quickGoal);
      sessionStorage.setItem("sparkai:plan", JSON.stringify(data));
      setProgress({ step: progressSteps.length, message: "Plan generated successfully!", isActive: false });
      setTimeout(() => router.push("/flow/plan"), 1000);
    } catch (error) {
      console.error("Failed to create AI plan:", error);
      setProgress({ step: 0, message: "Failed to create AI plan. Please try again.", isActive: false });
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const selectTemplate = (goal: string) => {
    setQuickGoal(goal);
    setShowTemplates(false);
  };

  const selectHistoryGoal = (goal: string) => {
    setQuickGoal(goal);
    setShowHistory(false);
  };

  return (
    <div className="card-enhanced ms-hover-scale" style={{
      borderRadius: '20px',
      padding: '28px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.2) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          AI Command Center
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', margin: '0 0 24px 0' }}>
          Tell Rift Reach what you want to achieve and watch it build your entire outreach strategy.
        </p>
        
        <form onSubmit={handleQuickGoalSubmit} style={{
          background: 'var(--elev-bg)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--elev-border)',
          marginBottom: '20px',
          boxShadow: 'var(--elev-shadow)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: 'var(--color-text)'
              }}>
                What's your growth goal?
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={quickGoal}
                  onChange={(e) => setQuickGoal(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px 50px 12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--elev-border)',
                    background: '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                  placeholder="Ex: Get 50 demos with SaaS founders in 30 days..."
                />
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={isListening}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    background: isListening 
                      ? 'rgba(255, 107, 107, 0.12)' 
                      : 'rgba(var(--color-primary-rgb), 0.2)',
                    border: '1px solid var(--elev-border)',
                    borderRadius: '6px',
                    padding: '6px',
                    color: isListening ? '#ff6b6b' : 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              </div>
              
              {goalValidation.score > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text)' }}>Goal Quality</span>
                    <div style={{ 
                      width: '100px', 
                      height: '4px', 
                      background: 'var(--color-border-light)', 
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${goalValidation.score}%`,
                        height: '100%',
                        background: goalValidation.score >= 80 ? 'var(--color-primary)' : goalValidation.score >= 60 ? '#ffa500' : '#ff6b6b',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text)' }}>{goalValidation.score}%</span>
                  </div>
                  {goalValidation.suggestions.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Tip: {goalValidation.suggestions[0]}
                    </div>
                  )}
                  <div className="inline-badges">
                    <span className={`inline-badge ${hasNumber ? 'on' : 'off'}`}>
                      <span className="inline-dot" /> Numbers
                    </span>
                    <span className={`inline-badge ${hasTimeline ? 'on' : 'off'}`}>
                      <span className="inline-dot" /> Timeline
                    </span>
                    <span className={`inline-badge ${hasAudience ? 'on' : 'off'}`}>
                      <span className="inline-dot" /> Audience
                    </span>
                    <span className={`inline-badge ${hasChannel ? 'on' : 'off'}`}>
                      <span className="inline-dot" /> Channels
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button 
              type="submit"
              disabled={isSubmittingGoal || !quickGoal.trim()}
              style={{
                background: isSubmittingGoal || !quickGoal.trim() 
                  ? 'var(--color-surface-secondary)' 
                  : 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
                border: isSubmittingGoal || !quickGoal.trim() ? '1px solid var(--color-border)' : 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                color: isSubmittingGoal || !quickGoal.trim() ? 'var(--color-text)' : '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmittingGoal || !quickGoal.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.2)',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {isSubmittingGoal ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid var(--color-text-muted)',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Creating...
                </>
              ) : (
                'Generate Plan'
              )}
            </button>
          </div>
        </form>

        <div className="link-card" style={{ borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <div className="input-with-icon" style={{ justifyContent: 'center' }}>
            <span className="icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/><path d="M21 21l-6-6"/>
              </svg>
            </span>
            <input
              type="url"
              value={quickLink}
              onChange={(e) => setQuickLink(e.target.value)}
              placeholder="Paste a LinkedIn search, Google Sheet, or CSV URL"
              style={{ minWidth: '320px', maxWidth: '720px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const link = quickLink.trim();
                  if (!/^https?:\/\//i.test(link)) return;
                  setQuickGoal(`Generate a targeted plan from this link: ${link}`);
                }
              }}
            />
            <button
              onClick={() => {
                const link = quickLink.trim();
                if (!/^https?:\/\//i.test(link)) {
                  showWarning('Invalid Link', 'Please paste a valid http(s) link');
                  return;
                }
                setQuickGoal(`Generate a targeted plan from this link: ${link}`);
              }}
              className="btn-primary glow ms-hover-scale ms-press focus-ring"
              style={{ padding: '10px 14px', borderRadius: '10px', whiteSpace: 'nowrap' }}
            >
              Use Link
            </button>
          </div>
          <div className="link-helper">
            <span className="text-hint">Tip: Drop a LinkedIn search results URL to auto-target that audience.</span>
          </div>
        </div>

        {progress.isActive && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                animation: 'pulse 1s infinite'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: '600' }}>
                {progress.message}
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(progress.step / progressSteps.length) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-primary) 0%, #F29F67 100%)',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn-ghost ms-hover-scale ms-press focus-ring">Templates</button>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-ghost ms-hover-scale ms-press focus-ring">History</button>
          <button 
            onClick={() => setShowQuickActions(!showQuickActions)} 
            className="btn-ghost ms-hover-scale ms-press focus-ring"
          >
            Quick Actions
          </button>
          <button onClick={() => setDrawerOpen(true)} className="btn-ghost ms-hover-scale ms-press focus-ring">Backlog</button>
          <button onClick={() => router.push('/flow/new-goal')} className="btn-primary ms-hover-scale ms-press focus-ring">Full AI Flow</button>
        </div>

        {showTemplates && (
          <div style={{
            background: 'rgb(243 240 255)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 12px 0' }}>
              Choose a template:
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {goalTemplates.map((template) => (
                <div key={template.category}>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>
                    {template.category}
                  </h4>
                  {template.goals.map((goal, i) => (
                    <button
                      key={`${template.category}-${i}`}
                      onClick={() => selectTemplate(goal)}
                      style={{
                        background: 'rgba(var(--color-primary-rgb), 0.2)',
                        border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginBottom: '4px',
                        width: '100%',
                        textAlign: 'left',
                        transition: '0.3s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.2)')}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistory && goalHistory.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: '0 0 12px 0' }}>
              Recent goals:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goalHistory.map((goal, index) => (
                <button
                  key={index}
                  onClick={() => selectHistoryGoal(goal)}
                  style={{
                    background: 'rgba(var(--color-primary-rgb), 0.2)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.2)';
                  }}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        )}

        {showQuickActions && (
          <div className="node-grid" style={{ marginBottom: '20px' }}>
            {quickActions.map((action, index) => (
              <div key={index} className="node-tile" onClick={() => {
                setQuickGoal(action.title);
                setShowQuickActions(false);
              }} style={{ cursor: 'pointer' }}>
                <div className="node-head">
                  <span>{action.title}</span>
                </div>
                <div className="node-desc">{action.description}</div>
              </div>
            ))}
          </div>
        )}

        {aiInsights.length > 0 && (
          <div style={{
            background: 'rgb(243, 240, 255)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'rgb(124, 58, 237)',
                animation: '2s ease 0s infinite normal none running pulse'
              }} />
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)' }}>
                {aiInsights[currentInsight]}
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          Backlog
          <button onClick={() => setDrawerOpen(false)} className="btn-ghost ms-hover-scale ms-press focus-ring">Close</button>
        </div>
        <div className="drawer-body">
          {backlog.length === 0 ? (
            <div className="text-hint">No pinned items yet. Pin recommendations to build your backlog.</div>
          ) : (
            backlog.map((item, idx) => (
              <div key={idx} className="drawer-item">
                <span style={{ fontSize: '13px' }}>{item}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="preset-chip ms-hover-scale ms-press focus-ring" onClick={() => {
                    if (idx === 0) return; const copy = [...backlog]; [copy[idx-1], copy[idx]] = [copy[idx], copy[idx-1]]; setBacklog(copy);
                  }}>↑</button>
                  <button className="preset-chip ms-hover-scale ms-press focus-ring" onClick={() => {
                    if (idx === backlog.length-1) return; const copy = [...backlog]; [copy[idx+1], copy[idx]] = [copy[idx], copy[idx+1]]; setBacklog(copy);
                  }}>↓</button>
                  <button className="preset-chip ms-hover-scale ms-press focus-ring" onClick={() => setBacklog(backlog.filter((_,i)=>i!==idx))}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn-primary ms-hover-scale ms-press focus-ring" style={{ width: '100%' }} onClick={() => router.push('/flow/new-goal')}>Send to Flow</button>
        </div>
      </aside>
    </div>
  );
}

