"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import { AppBrandLogoMark } from "@/components/ui/AppBrandLogo";
import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";
import LandingThemeToggle from "@/components/ui/LandingThemeToggle";
import "@/styles/landing-theme-light.css";

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <div ref={countRef}>{count}{suffix}</div>;
}

// Floating particles background
function ParticlesBackground() {
  return (
    <div className="particles-container">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

// Video placeholder component
function VideoPlaceholder({ title, duration }: { title: string; duration: string }) {
  return (
    <div className="video-placeholder">
      <div className="video-gradient-overlay" />
      <div className="video-play-btn" aria-hidden>
        <Icons.Play size={32} />
      </div>
      <div className="video-info">
        <span className="video-title">{title}</span>
        <span className="video-duration">{duration}</span>
      </div>
      <div className="video-shimmer" />
    </div>
  );
}

// App mockup component
function AppMockup() {
  return (
    <div className="app-mockup">
      <div className="mockup-header">
        <div className="mockup-dots">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        <div className="mockup-url">
          <Icons.Lock size={12} />
          <span>app.salescopilot.io/dashboard</span>
        </div>
      </div>
      <div className="mockup-content">
        <div className="mockup-sidebar">
          <div className="sidebar-item active">
            <Icons.Dashboard size={16} />
          </div>
          <div className="sidebar-item">
            <Icons.Users size={16} />
          </div>
          <div className="sidebar-item">
            <Icons.Mail size={16} />
          </div>
          <div className="sidebar-item">
            <Icons.Chart size={16} />
          </div>
        </div>
        <div className="mockup-main">
          <div className="mockup-stats">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Icons.Users size={18} />
              </div>
              <div className="stat-info">
                <span className="stat-value">12,847</span>
                <span className="stat-label">Total Leads</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <Icons.Mail size={18} />
              </div>
              <div className="stat-info">
                <span className="stat-value">45.2%</span>
                <span className="stat-label">Open Rate</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <Icons.TrendingUp size={18} />
              </div>
              <div className="stat-info">
                <span className="stat-value">$284K</span>
                <span className="stat-label">Revenue</span>
              </div>
            </div>
          </div>
          <div className="mockup-chart">
            <div className="chart-bars">
              {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                <div key={i} className="chart-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
          <div className="mockup-leads">
            {[1, 2, 3].map((i) => (
              <div key={i} className="lead-row">
                <div className="lead-avatar" />
                <div className="lead-info">
                  <div className="lead-name" />
                  <div className="lead-company" />
                </div>
                <div className="lead-status" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Testimonial card
function TestimonialCard({ name, role, company, quote, avatar }: { name: string; role: string; company: string; quote: string; avatar: string }) {
  return (
    <div className="testimonial-card">
      <div className="testimonial-quote">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
        </svg>
        <p>{quote}</p>
      </div>
      <div className="testimonial-author">
        <div className="author-avatar" style={{ background: avatar }} />
        <div className="author-info">
          <span className="author-name">{name}</span>
          <span className="author-role">{role} at {company}</span>
        </div>
      </div>
      <div className="testimonial-stars">
        {[...Array(5)].map((_, i) => (
          <Icons.Star key={i} size={14} />
        ))}
      </div>
    </div>
  );
}

// Platform Icons for Integrations
const PlatformIcons = {
  Salesforce: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#00A1E0" d="M20.1,10.5c1.4-1.5,3.4-2.4,5.6-2.4c2.8,0,5.3,1.5,6.7,3.8c1.2-0.5,2.5-0.8,3.9-0.8 c5.5,0,10,4.5,10,10s-4.5,10-10,10c-0.7,0-1.4-0.1-2.1-0.2c-1.2,2.4-3.7,4-6.5,4c-1.2,0-2.3-0.3-3.3-0.8c-1.2,2.3-3.6,3.9-6.4,3.9 c-2.5,0-4.7-1.3-6-3.2c-0.6,0.1-1.2,0.2-1.9,0.2c-4.9,0-8.9-4-8.9-8.9c0-3.4,1.9-6.3,4.7-7.8c-0.2-0.7-0.3-1.4-0.3-2.2 c0-4.4,3.6-8,8-8C16.3,8.1,18.7,8.9,20.1,10.5z"/>
    </svg>
  ),
  HubSpot: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#FF7A59" d="M35.5,20.2v-5.5c1.4-0.7,2.4-2.2,2.4-3.9c0-2.4-1.9-4.3-4.3-4.3s-4.3,1.9-4.3,4.3c0,1.7,1,3.2,2.4,3.9v5.5 c-1.8,0.4-3.4,1.2-4.7,2.4l-12.4-9.4c0.1-0.4,0.2-0.8,0.2-1.3c0-2.6-2.1-4.7-4.7-4.7S5.4,9.3,5.4,11.9s2.1,4.7,4.7,4.7 c0.9,0,1.7-0.3,2.4-0.7l12.2,9.2c-0.8,1.4-1.2,3-1.2,4.7c0,5.3,4.3,9.6,9.6,9.6s9.6-4.3,9.6-9.6C42.7,25.1,39.6,21.2,35.5,20.2z M33.1,35.3c-3.1,0-5.6-2.5-5.6-5.6s2.5-5.6,5.6-5.6s5.6,2.5,5.6,5.6S36.2,35.3,33.1,35.3z"/>
    </svg>
  ),
  Pipedrive: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <circle fill="#3E9D5D" cx="24" cy="24" r="20"/>
      <path fill="#fff" d="M24,12c-6.6,0-12,5.4-12,12s5.4,12,12,12s12-5.4,12-12S30.6,12,24,12z M24,32c-4.4,0-8-3.6-8-8s3.6-8,8-8 s8,3.6,8,8S28.4,32,24,32z"/>
      <circle fill="#fff" cx="24" cy="24" r="4"/>
    </svg>
  ),
  Gmail: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
      <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
      <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"/>
    </svg>
  ),
  LinkedIn: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#0288D1" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z"/>
      <path fill="#FFF" d="M12 19H17V36H12zM14.485 17h-.028C12.965 17 12 15.888 12 14.499 12 13.08 12.995 12 14.514 12c1.521 0 2.458 1.08 2.486 2.499C17 15.887 16.035 17 14.485 17zM36 36h-5v-9.099c0-2.198-1.225-3.698-3.192-3.698-1.501 0-2.313 1.012-2.707 1.99C24.957 25.543 25 26.511 25 27v9h-5V19h5v2.616C25.721 20.5 26.85 19 29.738 19c3.578 0 6.261 2.25 6.261 7.274L36 36 36 36z"/>
    </svg>
  ),
  Slack: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#33d375" d="M33,8c0-2.209-1.791-4-4-4s-4,1.791-4,4c0,2.209,1.791,4,4,4h4V8z"/>
      <path fill="#33d375" d="M35,12c-2.209,0-4,1.791-4,4s1.791,4,4,4c2.209,0,4-1.791,4-4v-4H35z"/>
      <path fill="#40c4ff" d="M15,28c2.209,0,4-1.791,4-4s-1.791-4-4-4c-2.209,0-4,1.791-4,4v4H15z"/>
      <path fill="#40c4ff" d="M11,24c0-2.209,1.791-4,4-4s4,1.791,4,4v11c0,2.209-1.791,4-4,4s-4-1.791-4-4V24z"/>
      <path fill="#e91e63" d="M24,36c-2.209,0-4,1.791-4,4s1.791,4,4,4c2.209,0,4-1.791,4-4v-4H24z"/>
      <path fill="#e91e63" d="M28,32c0,2.209-1.791,4-4,4s-4-1.791-4-4V21c0-2.209,1.791-4,4-4s4,1.791,4,4V32z"/>
      <path fill="#ffc107" d="M37,20c0,2.209-1.791,4-4,4s-4-1.791-4-4V9c0-2.209,1.791-4,4-4s4,1.791,4,4V20z"/>
      <path fill="#ffc107" d="M33,24c2.209,0,4-1.791,4-4s-1.791-4-4-4h-4v4C29,22.209,30.791,24,33,24z"/>
    </svg>
  ),
  Zapier: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#FF4A00" d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z M31.5,25.5h-4.793l3.39,3.39 l-2.122,2.122L24,27.036l-3.975,3.975l-2.122-2.122l3.39-3.39H16.5v-3h4.793l-3.39-3.39l2.122-2.122L24,20.964l3.975-3.975 l2.122,2.122l-3.39,3.39H31.5V25.5z"/>
    </svg>
  ),
  Outlook: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#1976d2" d="M28,13h14.533C43.343,13,44,13.657,44,14.467v19.066C44,34.343,43.343,35,42.533,35H28V13z"/>
      <path fill="#2196f3" d="M28,35l-16-5V13l16-5V35z"/>
      <path fill="#fff" d="M20,18.5c-3.038,0-5.5,2.462-5.5,5.5s2.462,5.5,5.5,5.5s5.5-2.462,5.5-5.5S23.038,18.5,20,18.5z M20,27 c-1.657,0-3-1.343-3-3s1.343-3,3-3s3,1.343,3,3S21.657,27,20,27z"/>
      <path fill="#fff" d="M34,20v8h-4v-8H34z M38,20v8h-3v-8H38z"/>
    </svg>
  ),
  Zoho: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#F4511E" d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"/>
      <path fill="#fff" d="M33,31H15c-1.105,0-2-0.895-2-2V19c0-1.105,0.895-2,2-2h18c1.105,0,2,0.895,2,2v10C35,30.105,34.105,31,33,31z"/>
      <path fill="#F4511E" d="M24,27c-1.657,0-3-1.343-3-3s1.343-3,3-3s3,1.343,3,3S25.657,27,24,27z"/>
    </svg>
  ),
  Airtable: () => (
    <svg viewBox="0 0 48 48" width="40" height="40">
      <path fill="#FCB400" d="M24,6L6,14v20l18,8l18-8V14L24,6z"/>
      <path fill="#18BFFF" d="M24,6L6,14l18,8l18-8L24,6z"/>
      <path fill="#F82B60" d="M24,22L6,14v20l18,8V22z"/>
      <path fill="#7C3AED" d="M24,22l18-8v20l-18,8V22z"/>
    </svg>
  )
};

// Integration card with icon
function IntegrationCard({ name, icon }: { name: string; icon: React.ReactNode }) {
  return (
    <div className="integration-card">
      <div className="integration-icon">
        {icon}
      </div>
      <span className="integration-name">{name}</span>
    </div>
  );
}

// FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question">
        <span>{question}</span>
        <div className="faq-toggle">
          {isOpen ? <Icons.ChevronUp size={20} /> : <Icons.ChevronDown size={20} />}
        </div>
      </div>
      <div className="faq-answer" style={{ maxHeight: isOpen ? '500px' : '0' }}>
        <p>{answer}</p>
      </div>
    </div>
  );
}

const LANDING_THEME_STORAGE_KEY = "spark-landing-theme";

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [landingAppearance, setLandingAppearance] = useState<"light" | "dark">("light");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LANDING_THEME_STORAGE_KEY);
      if (raw === "dark" || raw === "light") setLandingAppearance(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLandingAppearance = () => {
    setLandingAppearance((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(LANDING_THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  
  // Redirect authenticated users to dashboard - temporarily disabled for preview
  // useEffect(() => {
  //   if (isAuthenticated()) {
  //     router.push('/dashboard');
  //   }
  // }, [router]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { 
      icon: <Icons.Robot size={28} />, 
      title: 'AI Lead Generation', 
      desc: 'Find perfect prospects with natural language queries. Simply describe your ideal customer, and our AI finds thousands of qualified leads automatically.',
      color: '#7C3AED',
      highlight: 'Generate 10K+ leads in minutes'
    },
    { 
      icon: <Icons.Mail size={28} />, 
      title: 'Multi-Channel Outreach', 
      desc: 'Email, LinkedIn, WhatsApp, and cold calls in one unified platform. Orchestrate personalized campaigns across every channel.',
      color: '#A94CFF',
      highlight: '4x higher response rates'
    },
    { 
      icon: <Icons.Sparkles size={28} />, 
      title: 'AI Personalization', 
      desc: 'Every message is uniquely crafted using AI. Dynamic variables, tone matching, and context-aware content that feels genuinely human.',
      color: '#ff6b6b',
      highlight: '98% spam-free delivery'
    },
    { 
      icon: <Icons.Zap size={28} />, 
      title: 'Smart Sequences', 
      desc: 'Automated follow-ups that adapt to prospect behavior. AI optimizes send times, message variants, and cadence in real-time.',
      color: '#4ecdc4',
      highlight: 'Set once, run forever'
    },
    { 
      icon: <Icons.Target size={28} />, 
      title: 'Intent Scoring', 
      desc: 'AI-powered scoring identifies buying signals and intent. Focus your energy on leads most likely to convert.',
      color: '#FFD93D',
      highlight: '3x conversion improvement'
    },
    { 
      icon: <Icons.Chart size={28} />, 
      title: 'Revenue Analytics', 
      desc: 'Full-funnel visibility from first touch to closed deal. Track ROI, forecast revenue, and optimize your entire sales pipeline.',
      color: '#6BCF7F',
      highlight: 'Real-time dashboards'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'VP of Sales',
      company: 'TechCorp',
      quote: "Sales Co-Pilot transformed our outbound process. We went from 50 meetings/month to 200+ while our team actually got smaller. The AI personalization is incredible.",
      avatar: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Growth Lead',
      company: 'ScaleUp',
      quote: "The multi-channel orchestration is a game-changer. Our reply rates jumped 4x because prospects hear from us on their preferred channel at the right time.",
      avatar: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      name: 'Emma Watson',
      role: 'SDR Manager',
      company: 'CloudBase',
      quote: "My team of 5 SDRs now outperforms teams of 20. The AI handles the grunt work while we focus on actual conversations and closing deals.",
      avatar: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  const faqs = [
    {
      question: "How does the AI lead generation work?",
      answer: "Simply describe your ideal customer in natural language—like 'SaaS companies with 50-200 employees in fintech'—and our AI searches millions of data points to find matching prospects. We enrich each lead with verified emails, phone numbers, company data, and intent signals."
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required. You can generate up to 1,000 leads and send 500 emails during your trial to see real results."
    },
    {
      question: "How does Sales Co-Pilot prevent emails from going to spam?",
      answer: "We use AI-powered deliverability optimization including inbox warming, domain health monitoring, sending pattern analysis, and content optimization. Our customers see 98%+ inbox placement rates."
    },
    {
      question: "Can I import my existing leads?",
      answer: "Absolutely! Import from CSV, Excel, your CRM (Salesforce, HubSpot, Pipedrive), or any other source. We'll automatically enrich and score your existing database with fresh data."
    },
    {
      question: "What integrations are available?",
      answer: "Sales Co-Pilot integrates with all major CRMs (Salesforce, HubSpot, Pipedrive, Zoho), email providers (Gmail, Outlook, SMTP), LinkedIn, Slack, Zapier, and 100+ other tools via our API."
    }
  ];
  
  return (
    <div className={`landing-page${landingAppearance === "light" ? " landing-theme-light" : ""}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        .landing-page {
          --gradient-primary: linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%);
          --gradient-dark: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
          --gradient-card: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          --glass-bg: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.08);
          font-family: 'Inter', sans-serif;
          background: #050508;
          color: #fff;
          overflow-x: hidden;
        }

        /* Particles */
        .particles-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(124, 58, 237, 0.3);
          border-radius: 50%;
          animation: float-particle 5s ease-in-out infinite;
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }

        /* Header */
        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 12px 16px;
          display: block;
          z-index: 100;
          background: rgba(5, 5, 8, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }
        .header-scrolled {
          padding: 10px 14px;
          background: rgba(5, 5, 8, 0.95);
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        /* Product mark: AppBrandLogoMark (keeps landing + app shell in sync) */
        .logo-text {
          font-size: 22px;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }
        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }
        .nav-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link:hover {
          color: #fff;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--gradient-primary);
          transition: width 0.3s ease;
        }
        .nav-link:hover::after {
          width: 100%;
        }
        .nav-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .btn-login {
          padding: 10px 20px;
          color: #fff;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-login:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .btn-cta {
          padding: 10px 24px;
          color: #000;
          background: var(--gradient-primary);
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        }
        .btn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(124, 58, 237, 0.5);
        }

        /* Hero Section */
        .hero-section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 140px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero-glow {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%);
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }
        .hero-glow-secondary {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(169, 76, 255, 0.1) 0%, transparent 70%);
          bottom: -100px;
          right: -200px;
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          color: #7C3AED;
          margin-bottom: 24px;
          animation: fade-in-up 0.6s ease forwards;
        }
        .badge-dot {
          width: 8px;
          height: 8px;
          background: #7C3AED;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        .hero-title {
          font-size: clamp(48px, 8vw, 84px);
          font-weight: 900;
          text-align: center;
          line-height: 1.05;
          margin: 0 0 24px;
          max-width: 1000px;
          animation: fade-in-up 0.6s ease 0.1s forwards;
          opacity: 0;
        }
        .hero-title .gradient {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: clamp(18px, 2.5vw, 22px);
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          max-width: 700px;
          line-height: 1.7;
          margin: 0 0 40px;
          animation: fade-in-up 0.6s ease 0.2s forwards;
          opacity: 0;
        }
        .hero-buttons {
          display: flex;
          gap: 16px;
          margin-bottom: 60px;
          animation: fade-in-up 0.6s ease 0.3s forwards;
          opacity: 0;
        }
        .btn-hero-primary {
          padding: 18px 36px;
          font-size: 16px;
          font-weight: 700;
          color: #000;
          background: var(--gradient-primary);
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4);
        }
        .btn-hero-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 40px rgba(124, 58, 237, 0.5);
        }
        .btn-hero-secondary {
          padding: 18px 36px;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
        }
        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stats Row */
        .stats-row {
          display: flex;
          gap: 48px;
          padding: 32px 48px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          animation: fade-in-up 0.6s ease 0.4s forwards;
          opacity: 0;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 36px;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        /* Trusted By */
        .trusted-section {
          padding: 80px 24px;
          text-align: center;
        }
        .trusted-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 32px;
        }
        .trusted-logos {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 48px;
          flex-wrap: wrap;
          opacity: 0.4;
        }
        .company-logo {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          font-family: 'Inter', sans-serif;
        }

        /* Video Section */
        .video-section {
          padding: 100px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(169, 76, 255, 0.1);
          border: 1px solid rgba(169, 76, 255, 0.2);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: #A94CFF;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .section-title {
          font-size: clamp(36px, 5vw, 52px);
          font-weight: 800;
          margin: 0 0 16px;
          line-height: 1.1;
        }
        .section-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.5);
          max-width: 600px;
          margin: 0 auto;
        }
        .video-placeholder {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .video-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(45deg, rgba(124, 58, 237, 0.2) 0%, rgba(169, 76, 255, 0.2) 100%);
        }
        .video-play-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.5);
          z-index: 3;
        }
        .video-play-btn:hover {
          transform: translate(-50%, -50%) scale(1.08);
          box-shadow: 0 10px 36px rgba(124, 58, 237, 0.55);
        }
        .video-info {
          position: absolute;
          bottom: 24px;
          left: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
        }
        .video-title {
          font-size: 18px;
          font-weight: 700;
        }
        .video-duration {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
        .video-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Features Section */
        .features-section {
          padding: 120px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feature-item {
          padding: 24px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .feature-item.active {
          background: rgba(124, 58, 237, 0.08);
          border-color: rgba(124, 58, 237, 0.3);
        }
        .feature-item:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }
        .feature-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-title {
          font-size: 18px;
          font-weight: 700;
        }
        .feature-highlight {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(124, 58, 237, 0.15);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #7C3AED;
          margin-left: auto;
        }
        .feature-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          padding-left: 64px;
        }
        .features-showcase {
          position: relative;
        }

        /* App Mockup */
        .app-mockup {
          background: #1a1a2e;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
        }
        .mockup-header {
          padding: 12px 16px;
          background: #0f0f1a;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .mockup-dots {
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }
        .mockup-url {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
        .mockup-content {
          display: flex;
          min-height: 400px;
        }
        .mockup-sidebar {
          width: 60px;
          background: #0f0f1a;
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .sidebar-item {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          transition: all 0.2s ease;
        }
        .sidebar-item.active {
          background: rgba(124, 58, 237, 0.2);
          color: #7C3AED;
        }
        .mockup-main {
          flex: 1;
          padding: 24px;
        }
        .mockup-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon.blue { background: rgba(124, 58, 237, 0.2); color: #7C3AED; }
        .stat-icon.purple { background: rgba(169, 76, 255, 0.2); color: #A94CFF; }
        .stat-icon.green { background: rgba(107, 207, 127, 0.2); color: #6BCF7F; }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-card .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          background: none;
          -webkit-text-fill-color: #fff;
        }
        .stat-card .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
        .mockup-chart {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          height: 120px;
        }
        .chart-bar {
          flex: 1;
          background: var(--gradient-primary);
          border-radius: 6px 6px 0 0;
          animation: grow-bar 1s ease forwards;
        }
        @keyframes grow-bar {
          from { height: 0; }
        }
        .mockup-leads {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lead-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .lead-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%);
        }
        .lead-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lead-name {
          width: 120px;
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .lead-company {
          width: 80px;
          height: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .lead-status {
          width: 60px;
          height: 24px;
          background: rgba(107, 207, 127, 0.2);
          border-radius: 6px;
        }

        /* How It Works */
        .how-section {
          padding: 120px 24px;
          background: linear-gradient(180deg, transparent 0%, rgba(124, 58, 237, 0.03) 50%, transparent 100%);
        }
        .how-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 60px;
        }
        .step-card {
          position: relative;
          padding: 40px 32px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          text-align: center;
          transition: all 0.3s ease;
        }
        .step-card:hover {
          transform: translateY(-8px);
          border-color: rgba(124, 58, 237, 0.3);
          box-shadow: 0 20px 40px rgba(124, 58, 237, 0.15);
        }
        .step-number {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 48px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          color: #000;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
        }
        .step-icon {
          width: 80px;
          height: 80px;
          margin: 24px auto;
          background: rgba(124, 58, 237, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7C3AED;
        }
        .step-title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .step-desc {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
        }

        /* Testimonials */
        .testimonials-section {
          padding: 120px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 60px;
        }
        .testimonial-card {
          padding: 32px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .testimonial-quote {
          position: relative;
          margin-bottom: 24px;
        }
        .testimonial-quote svg {
          position: absolute;
          top: -8px;
          left: -8px;
          color: #7C3AED;
        }
        .testimonial-quote p {
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          padding-left: 24px;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .author-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }
        .author-info {
          display: flex;
          flex-direction: column;
        }
        .author-name {
          font-size: 15px;
          font-weight: 700;
        }
        .author-role {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }
        .testimonial-stars {
          display: flex;
          gap: 4px;
          color: #FFD93D;
        }

        /* Integrations */
        .integrations-section {
          padding: 100px 24px;
          text-align: center;
        }
        .integrations-grid {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
          margin-top: 48px;
          max-width: 1000px;
          margin-left: auto;
          margin-right: auto;
        }
        .integration-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 32px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        .integration-card:hover {
          transform: translateY(-4px);
          border-color: rgba(124, 58, 237, 0.3);
          box-shadow: 0 12px 32px rgba(124, 58, 237, 0.15);
          background: rgba(124, 58, 237, 0.05);
        }
        .integration-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .integration-icon svg {
          width: 48px;
          height: 48px;
        }
        .integration-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
        }

        /* FAQ Section */
        .faq-section {
          padding: 120px 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        .faq-list {
          margin-top: 60px;
        }
        .faq-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }
        .faq-question {
          padding: 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 17px;
          font-weight: 600;
        }
        .faq-toggle {
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s ease;
        }
        .faq-item.open .faq-toggle {
          color: #7C3AED;
        }
        .faq-answer {
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .faq-answer p {
          padding-bottom: 24px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.8;
          margin: 0;
        }

        /* Final CTA */
        .cta-section {
          padding: 120px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%);
          border-radius: 40px;
          margin: 0 24px;
        }
        .cta-content {
          position: relative;
          z-index: 1;
          max-width: 700px;
          margin: 0 auto;
        }
        .cta-title {
          font-size: clamp(36px, 5vw, 52px);
          font-weight: 800;
          margin: 0 0 20px;
          line-height: 1.1;
        }
        .cta-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 40px;
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .cta-note {
          margin-top: 24px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Footer */
        .landing-footer {
          padding: 80px 24px 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 1400px;
          margin: 0 auto;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr);
          gap: 48px;
          margin-bottom: 60px;
        }
        .footer-brand p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.7;
          margin-top: 16px;
          max-width: 300px;
        }
        .footer-social {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .social-link {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.3s ease;
        }
        .social-link:hover {
          background: rgba(124, 58, 237, 0.2);
          border-color: rgba(124, 58, 237, 0.3);
          color: #7C3AED;
        }
        .footer-column h4 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 20px;
          color: #fff;
        }
        .footer-column a {
          display: block;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s ease;
        }
        .footer-column a:hover {
          color: #fff;
        }
        .footer-bottom {
          padding-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-copyright {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
        }
        .footer-links {
          display: flex;
          gap: 24px;
        }
        .footer-links a {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: #fff;
        }

        /* Pricing Section */
        .pricing-section {
          padding: 120px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 60px;
        }
        .scp-pricing-layout {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-top: 48px;
        }
        .scp-top-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 20px;
          align-items: stretch;
        }
        @media (max-width: 768px) {
          .scp-top-row {
            grid-template-columns: 1fr;
          }
        }
        .pricing-card.scp-setup-top {
          padding: 22px 24px 24px;
          text-align: left;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .pricing-card.scp-setup-top:hover {
          transform: translateY(-4px);
        }
        .scp-setup-top-kicker {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #A94CFF;
          margin-bottom: 10px;
        }
        .scp-setup-top-name {
          font-size: 21px;
          font-weight: 800;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .scp-setup-top-lead {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.52);
          line-height: 1.55;
          margin: 0 0 14px;
        }
        .scp-setup-top-price {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .scp-setup-top-amount {
          font-size: 32px;
        }
        .scp-setup-top-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
        }
        .scp-setup-top-li {
          margin-bottom: 0;
          font-size: 13px;
        }
        .scp-setup-top-li .pricing-feature-text {
          font-size: 13px;
        }
        .scp-setup-top-foot {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.42);
          margin: 0 0 14px;
          line-height: 1.45;
        }
        .scp-setup-top-cta {
          width: 100%;
          margin-top: auto;
          padding: 13px 18px;
          font-size: 15px;
        }
        .pricing-card.scp-custom-top {
          padding: 22px 24px 24px;
          text-align: left;
          display: flex;
          flex-direction: column;
          border-style: dashed;
          border-color: rgba(169, 76, 255, 0.38);
          background: rgba(255, 255, 255, 0.025);
          min-height: 0;
        }
        .pricing-card.scp-custom-top:hover {
          transform: translateY(-4px);
        }
        .scp-custom-top-kicker {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 10px;
        }
        .scp-custom-top-name {
          font-size: 21px;
          font-weight: 800;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .scp-custom-top-lead {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.52);
          line-height: 1.55;
          margin: 0 0 14px;
        }
        .scp-custom-top-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .scp-custom-top-foot {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.42);
          margin: 0 0 14px;
          line-height: 1.45;
        }
        .scp-custom-top-cta {
          width: 100%;
          margin-top: auto;
          padding: 13px 18px;
          font-size: 15px;
        }
        .scp-tier-section-label {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.42);
          margin: 4px 0 0;
        }
        .scp-tier-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }
        .scp-tier-grid .pricing-card.featured {
          transform: none;
        }
        .scp-tier-grid .pricing-card.featured:hover {
          transform: translateY(-8px);
        }
        .scp-tier-header {
          margin-bottom: 20px;
          padding-bottom: 20px;
        }
        .scp-custom-chip {
          font-size: 11px;
          font-weight: 600;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(124, 58, 237, 0.16);
          border: 1px solid rgba(124, 58, 237, 0.28);
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.35;
        }
        .pricing-card {
          position: relative;
          padding: 40px 32px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          border-color: rgba(124, 58, 237, 0.3);
          box-shadow: 0 20px 40px rgba(124, 58, 237, 0.15);
        }
        .pricing-card.featured {
          background: linear-gradient(145deg, rgba(124, 58, 237, 0.15) 0%, rgba(169, 76, 255, 0.1) 100%);
          border-color: rgba(124, 58, 237, 0.4);
          transform: scale(1.02);
        }
        .pricing-card.featured:hover {
          transform: scale(1.02) translateY(-8px);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px;
          background: var(--gradient-primary);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
        }
        .pricing-header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .pricing-name {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .pricing-tagline {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 24px;
        }
        .pricing-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
        }
        .pricing-amount {
          font-size: 48px;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pricing-currency {
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
        }
        .pricing-period {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.5);
        }
        .pricing-custom {
          font-size: 36px;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pricing-highlight {
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
        }
        .pricing-highlight-text {
          font-size: 18px;
          font-weight: 700;
          color: #7C3AED;
          margin: 0;
        }
        .pricing-highlight-sub {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 4px 0 0;
        }
        .pricing-features {
          flex: 1;
          margin-bottom: 32px;
        }
        .pricing-features-title {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .pricing-feature {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }
        .pricing-feature-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(124, 58, 237, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7C3AED;
        }
        .pricing-feature-text {
          line-height: 1.5;
        }
        .pricing-section-title {
          font-size: 13px;
          font-weight: 600;
          color: #A94CFF;
          margin: 20px 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pricing-cta {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .pricing-cta-primary {
          background: var(--gradient-primary);
          border: none;
          color: #000;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
        }
        .pricing-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(124, 58, 237, 0.4);
        }
        .pricing-cta-secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .pricing-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(124, 58, 237, 0.4);
        }
        .pricing-note {
          margin-top: 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }
        .pricing-enterprise-note {
          margin-top: 24px;
          padding: 16px;
          background: rgba(169, 76, 255, 0.1);
          border: 1px solid rgba(169, 76, 255, 0.2);
          border-radius: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          text-align: center;
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .scp-tier-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .scp-tier-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .pricing-card.featured {
            transform: scale(1);
          }
          .pricing-card.featured:hover {
            transform: translateY(-8px);
          }
          .features-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .features-section {
            padding: 88px 20px;
          }
          .features-list,
          .features-showcase {
            min-width: 0;
            max-width: 100%;
          }
          .feature-item {
            max-width: 100%;
            box-sizing: border-box;
          }
          .testimonials-grid {
            grid-template-columns: 1fr;
          }
          .steps-grid {
            grid-template-columns: 1fr;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
          }
          .trusted-section {
            padding: 56px 16px;
          }
          .integrations-section {
            padding: 72px 16px;
          }
          .how-section {
            padding: 80px 16px;
          }
          .testimonials-section {
            padding: 80px 16px;
          }
          .faq-section {
            padding: 80px 16px;
          }
          .cta-section {
            padding: 80px 16px;
          }
          .pricing-section {
            padding: 80px 16px;
          }
        }
        @media (max-width: 768px) {
          .landing-header {
            padding: 10px 12px;
          }
          .stats-row {
            flex-wrap: wrap;
            gap: 24px;
            padding: 24px;
          }
          .hero-section {
            padding: 120px 16px 64px;
          }
          .hero-buttons {
            flex-direction: column;
            width: 100%;
            padding: 0 16px;
          }
          .btn-hero-primary, .btn-hero-secondary {
            width: 100%;
            justify-content: center;
          }
          .video-section {
            padding: 64px 16px;
          }
          .section-header {
            margin-bottom: 36px;
          }
          .section-subtitle {
            font-size: 15px;
            padding: 0 4px;
          }
          .video-info {
            left: 14px;
            right: 14px;
            bottom: 16px;
          }
          .video-play-btn {
            width: 68px;
            height: 68px;
          }
          .video-play-btn:hover {
            transform: translate(-50%, -50%) scale(1.05);
          }
          .video-title {
            font-size: 15px;
            line-height: 1.25;
          }
          .features-section {
            padding: 72px 16px;
          }
          .features-grid {
            gap: 28px;
          }
          .feature-header {
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 10px;
          }
          .feature-header .feature-icon {
            flex-shrink: 0;
          }
          .feature-title {
            flex: 1 1 auto;
            min-width: 0;
            font-size: 16px;
            word-break: break-word;
          }
          .feature-highlight {
            margin-left: 0;
            flex: 0 0 auto;
          }
          .feature-desc {
            padding-left: 0;
            margin-top: 4px;
            font-size: 13px;
          }
          .features-showcase {
            width: 100%;
            min-width: 0;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .app-mockup {
            min-width: 0;
            max-width: 100%;
          }
          .mockup-content {
            min-width: 0;
          }
          .mockup-main {
            min-width: 0;
            padding: 16px;
          }
          .mockup-url {
            min-width: 0;
            overflow: hidden;
          }
          .mockup-url span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .mockup-stats {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .integrations-grid {
            gap: 12px;
          }
          .integration-card {
            min-width: 0;
            flex: 1 1 calc(50% - 8px);
            max-width: 100%;
            box-sizing: border-box;
            padding: 16px 14px;
          }
          .chart-bars {
            gap: 8px;
            height: 100px;
          }
          .cta-buttons {
            flex-direction: column;
          }
          .footer-grid {
            grid-template-columns: 1fr;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }

        @media (max-width: 520px) {
          .mockup-content {
            flex-direction: column;
            min-height: 0;
          }
          .mockup-sidebar {
            width: 100%;
            flex-direction: row;
            justify-content: center;
            padding: 10px 12px;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .mockup-main {
            padding: 12px;
          }
        }

        /* Nav: desktop row must not compete with hamburger (styled-jsx loads after imported CSS) */
        @media (max-width: 1024px) {
          .landing-header-inner nav.nav-links.landing-nav-desktop {
            display: none !important;
          }
          .landing-header-inner .landing-mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>

      <ParticlesBackground />

      {/* Header */}
      <header className={`landing-header ${scrollY > 50 ? "header-scrolled" : ""}`}>
        <div className="landing-header-inner">
          <div className="landing-header-left">
            <button
              type="button"
              className="landing-mobile-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} strokeWidth={1.75} />
            </button>
            <div className="logo-container">
              <AppBrandLogoMark size={44} />
              <span className="logo-text">Sales Co-Pilot</span>
            </div>
          </div>
          <nav className="nav-links landing-nav-desktop" aria-label="Primary">
            <Link href="#features" className="nav-link">
              Features
            </Link>
            <Link href="#how-it-works" className="nav-link">
              How It Works
            </Link>
            <Link href="#testimonials" className="nav-link">
              Testimonials
            </Link>
            <Link href="#pricing" className="nav-link">
              Pricing
            </Link>
          </nav>
          <div className="landing-header-actions">
            <LandingThemeToggle appearance={landingAppearance} onToggle={toggleLandingAppearance} />
            <div className="nav-buttons">
              <button className="btn-login" onClick={() => router.push("/auth/login")}>
                Log in
              </button>
              <button className="btn-cta" onClick={() => router.push("/auth/signup")}>
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <>
          <div className="landing-mobile-overlay" onClick={() => setMobileNavOpen(false)} role="presentation" />
          <div className="landing-mobile-panel" role="dialog" aria-modal="true" aria-label="Site menu">
            <button
              type="button"
              className="landing-mobile-panel-close"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <X size={22} strokeWidth={1.75} />
            </button>
            <Link href="#features" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Features
            </Link>
            <Link href="#how-it-works" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              How It Works
            </Link>
            <Link href="#testimonials" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Testimonials
            </Link>
            <Link href="#pricing" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Pricing
            </Link>
            <Link href="/auth/login" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Log in
            </Link>
            <Link href="/auth/signup" className="nav-link" onClick={() => setMobileNavOpen(false)}>
              Start free trial
            </Link>
          </div>
        </>
      ) : null}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-glow-secondary" />
        
        <div className="hero-badge">
          <span className="badge-dot" />
          AI-Powered Sales Automation
        </div>
        
        <h1 className="hero-title">
          Turn Your Sales Goals<br />Into <span className="gradient">Revenue</span>
          </h1>
          
        <p className="hero-subtitle">
            Plan, launch, and optimize omni-channel campaigns in minutes. 
          Generate leads, enrich data, and automate follow-ups with AI—all in one platform.
        </p>
        
        <div className="hero-buttons">
          <button className="btn-hero-primary" onClick={() => router.push('/auth/signup')}>
            <Icons.Rocket size={20} />
              Start Free Trial
            </button>
          <button className="btn-hero-secondary" onClick={() => router.push('/demo')}>
            <Icons.Play size={20} />
              Watch Demo
            </button>
          </div>

        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-value"><AnimatedCounter end={10} suffix="K+" /></div>
            <div className="stat-label">Active Users</div>
                </div>
          <div className="stat-item">
            <div className="stat-value"><AnimatedCounter end={50} suffix="M+" /></div>
            <div className="stat-label">Emails Sent</div>
                </div>
          <div className="stat-item">
            <div className="stat-value"><AnimatedCounter end={98} suffix="%" /></div>
            <div className="stat-label">Deliverability</div>
              </div>
          <div className="stat-item">
            <div className="stat-value"><AnimatedCounter end={4} suffix=".9" /></div>
            <div className="stat-label">User Rating</div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="trusted-section">
        <div className="trusted-title">Trusted by innovative sales teams worldwide</div>
        <div className="trusted-logos">
          <span className="company-logo">Stripe</span>
          <span className="company-logo">Notion</span>
          <span className="company-logo">Figma</span>
          <span className="company-logo">Vercel</span>
          <span className="company-logo">Linear</span>
          <span className="company-logo">Loom</span>
        </div>
      </section>

      {/* Video Section */}
      <section className="video-section" id="demo">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Play size={14} />
            Product Demo
          </div>
          <h2 className="section-title">See Spark AI in Action</h2>
          <p className="section-subtitle">
            Watch how our AI transforms your sales workflow in under 3 minutes
          </p>
        </div>
        <VideoPlaceholder title="Product Demo: AI-Powered Sales Automation" duration="2:47" />
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Sparkles size={14} />
            Features
          </div>
          <h2 className="section-title">Everything You Need to Scale</h2>
          <p className="section-subtitle">
            Powerful AI features designed to help you find, engage, and convert more leads
          </p>
        </div>

        <div className="features-grid">
          <div className="features-list">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className={`feature-item ${activeFeature === i ? 'active' : ''}`}
                onClick={() => setActiveFeature(i)}
              >
                <div className="feature-header">
                  <div className="feature-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
                    {feature.icon}
                  </div>
                  <span className="feature-title">{feature.title}</span>
                  <span className="feature-highlight" style={{ background: `${feature.color}15`, color: feature.color }}>
                    {feature.highlight}
                  </span>
                </div>
                <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
          </div>
          
          <div className="features-showcase">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section" id="how-it-works">
        <div className="how-container">
          <div className="section-header">
            <div className="section-badge">
              <Icons.Zap size={14} />
            How It Works
            </div>
            <h2 className="section-title">Get Results in 3 Simple Steps</h2>
            <p className="section-subtitle">
              From goal to revenue in minutes, not weeks
          </p>
        </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">
                <Icons.Target size={36} />
              </div>
              <h3 className="step-title">Define Your Goal</h3>
              <p className="step-desc">
                Tell our AI what you want to achieve. It analyzes your goal and creates a complete outreach strategy tailored to your business.
              </p>
                </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">
                <Icons.Robot size={36} />
              </div>
              <h3 className="step-title">AI Prepares Everything</h3>
              <p className="step-desc">
                We generate leads, enrich data, segment audiences, and draft personalized messages—all automatically while you grab coffee.
                </p>
              </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">
                <Icons.Rocket size={36} />
            </div>
              <h3 className="step-title">Launch & Optimize</h3>
              <p className="step-desc">
                Review, approve, and launch your campaign. Our AI continuously optimizes performance in real-time for maximum results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Star size={14} />
            Testimonials
          </div>
          <h2 className="section-title">Loved by Sales Teams</h2>
          <p className="section-subtitle">
            See what our customers have to say about Sales Co-Pilot
          </p>
        </div>
        
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="integrations-section">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Plug size={14} />
            Integrations
          </div>
          <h2 className="section-title">Works With Your Stack</h2>
          <p className="section-subtitle">
            Connect Sales Co-Pilot with your favorite tools
          </p>
        </div>
        
        <div className="integrations-grid">
          <IntegrationCard name="Salesforce" icon={<PlatformIcons.Salesforce />} />
          <IntegrationCard name="HubSpot" icon={<PlatformIcons.HubSpot />} />
          <IntegrationCard name="Gmail" icon={<PlatformIcons.Gmail />} />
          <IntegrationCard name="LinkedIn" icon={<PlatformIcons.LinkedIn />} />
          <IntegrationCard name="Outlook" icon={<PlatformIcons.Outlook />} />
        </div>
      </section>

      {/* Pricing */}
      <SalesCopilotPricingSection variant="landing" />

      {/* FAQ */}
      <section className="faq-section" id="faq">
        <div className="section-header">
          <div className="section-badge">
            <Icons.Info size={14} />
            FAQ
          </div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about Sales Co-Pilot
          </p>
        </div>
        
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section">
        <div className="cta-bg" />
        <div className="cta-content">
          <h2 className="cta-title">Ready to 10x Your Sales Pipeline?</h2>
          <p className="cta-subtitle">
            Join thousands of sales teams using AI to automate outreach and close more deals faster.
          </p>
          <div className="cta-buttons">
            <button className="btn-hero-primary" onClick={() => router.push('/auth/signup')}>
              <Icons.Rocket size={20} />
            Start Free Trial
          </button>
            <button className="btn-hero-secondary" onClick={() => router.push('/contact')}>
              <Icons.MessageCircle size={20} />
              Talk to Sales
          </button>
          </div>
          <p className="cta-note">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo-container">
              <AppBrandLogoMark size={44} />
              <span className="logo-text">Sales Co-Pilot</span>
            </div>
            <p>Your AI-powered sales co-pilot that helps you scale outreach and close more deals.</p>
            <div className="footer-social">
              <a href="#" className="social-link"><Icons.Linkedin size={18} /></a>
              <a href="#" className="social-link"><Icons.MessageCircle size={18} /></a>
              <a href="#" className="social-link"><Icons.Mail size={18} /></a>
            </div>
          </div>
          
          <div className="footer-column">
            <h4>Product</h4>
            <Link href="#features">Features</Link>
            <Link href="#how-it-works">How It Works</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/demo">Demo</Link>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/contact">Contact</Link>
          </div>

          <div className="footer-column">
            <h4>Resources</h4>
            <Link href="/docs">Documentation</Link>
            <Link href="/api">API Reference</Link>
            <Link href="/help">Help Center</Link>
            <Link href="/status">System Status</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          <span className="footer-copyright">© 2026 Sales Co-Pilot. All rights reserved.</span>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/security">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
