"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";

export default function LandingPage() {
  const router = useRouter();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navigation Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            height: '40px',
            width: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: 0,
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Spark AI</h1>
        </div>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="#features" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Features</Link>
          <Link href="#how-it-works" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>How It Works</Link>
          <Link href="#pricing" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Pricing</Link>
          <Link href="/auth/login" className="btn-ghost ms-hover-scale ms-press focus-ring">
            Log in
          </Link>
          <Link href="/auth/signup" className="btn-primary ms-hover-scale ms-press focus-ring">
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="hero" style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '900px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#4C67FF',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(76, 103, 255, 0.1)',
            borderRadius: '20px'
          }}>AI-Powered Sales Automation</div>
          
          <h1 style={{
            fontSize: 'clamp(42px, 7vw, 72px)',
            fontWeight: '900',
            margin: '0 0 32px 0',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Turn Your Sales Goals Into Revenue
          </h1>
          
          <p style={{
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            color: 'var(--color-text-muted)',
            margin: '0 0 48px 0',
            lineHeight: '1.7',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Plan, launch, and optimize omni-channel campaigns in minutes. 
            Generate leads, enrich data, and automate follow-ups with AI assistance—all in one platform.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '80px' }}>
            <button
              onClick={() => router.push('/auth/signup')}
              className="btn-primary ms-hover-scale ms-press focus-ring glow"
              style={{ padding: '18px 40px', fontSize: '18px', fontWeight: '600' }}
            >
              Start Free Trial
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="btn-ghost ms-hover-scale ms-press focus-ring"
              style={{ padding: '18px 40px', fontSize: '18px', fontWeight: '600' }}
            >
              Watch Demo
            </button>
          </div>

          {/* Social Proof Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '32px',
            marginTop: '60px',
            paddingTop: '40px',
            borderTop: '1px solid var(--color-border)'
          }}>
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '50M+', label: 'Emails Sent' },
              { value: '98%', label: 'Uptime' },
              { value: '4.9/5', label: 'User Rating' }
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#4C67FF', marginBottom: '8px' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '120px 24px',
        background: 'var(--color-surface)',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '800',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Everything You Need to Scale Sales
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Powerful features designed to help you find, engage, and convert more leads
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '60px'
        }}>
          {[
            { 
              icon: <Icons.Robot size={32} />, 
              title: 'AI Lead Generation', 
              desc: 'Find perfect prospects with natural language queries. AI understands your target audience and generates qualified leads automatically.',
              color: '#4C67FF'
            },
            { 
              icon: <Icons.Mail size={32} />, 
              title: 'Multi-Channel Outreach', 
              desc: 'Email, LinkedIn, WhatsApp, and calls in one platform. Manage all your outreach from a unified dashboard.',
              color: '#A94CFF'
            },
            { 
              icon: <Icons.Chart size={32} />, 
              title: 'Smart Segmentation', 
              desc: 'Auto-segments based on engagement, behavior, and buying signals. Focus your efforts on high-intent leads.',
              color: '#ff6b6b'
            },
            { 
              icon: <Icons.Zap size={32} />, 
              title: 'Automated Sequences', 
              desc: 'AI-optimized follow-ups that adapt to responses. Send the right message at the right time, automatically.',
              color: '#4ecdc4'
            },
            { 
              icon: <Icons.Target size={32} />, 
              title: 'Lead Scoring', 
              desc: 'AI-powered scoring identifies your hottest prospects. Prioritize outreach on leads most likely to convert.',
              color: '#FFD93D'
            },
            { 
              icon: <Icons.TrendingUp size={32} />, 
              title: 'Real-Time Analytics', 
              desc: 'Track opens, clicks, replies, and conversions in real-time. Make data-driven decisions to optimize performance.',
              color: '#6BCF7F'
            }
          ].map((f, i) => (
            <div key={i} className="card-enhanced ms-hover-scale" style={{
              padding: '32px',
              borderRadius: 20,
              textAlign: 'left',
              border: `2px solid ${f.color}20`,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 20px 40px ${f.color}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--elev-shadow)';
            }}
            >
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 16,
                background: `${f.color}15`,
                border: `1px solid ${f.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: f.color
              }}>{f.icon}</div>
              <h3 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 12px 0', color: f.color }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.6' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{
        padding: '120px 24px',
        background: 'var(--color-background)',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '800',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            How It Works
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Get started in 3 simple steps
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          position: 'relative'
        }}>
          {[
            {
              step: '01',
              title: 'Set Your Goal',
              desc: 'Tell the AI what you want to achieve. It analyzes your goal and creates a complete outreach strategy.',
              icon: <Icons.Target size={36} />
            },
            {
              step: '02',
              title: 'AI Prepares Everything',
              desc: 'We generate or import leads, enrich data, segment audiences, and draft personalized messages—all automatically.',
              icon: <Icons.Settings size={36} />
            },
            {
              step: '03',
              title: 'Launch & Grow',
              desc: 'Review, approve, and launch your campaign. Track performance and let AI optimize in real-time.',
              icon: <Icons.Rocket size={36} />
            }
          ].map((step, i) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                fontSize: '80px',
                fontWeight: '900',
                color: 'rgba(76, 103, 255, 0.1)',
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 0
              }}>
                {step.step}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  margin: '0 auto 24px',
                  boxShadow: '0 10px 30px rgba(76, 103, 255, 0.3)'
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '120px 24px',
        background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
        borderRadius: '32px',
        margin: '80px 24px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: '800',
          margin: '0 0 24px 0',
          background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Ready to Scale Your Sales?
        </h2>
        <p style={{
          fontSize: '20px',
          color: 'var(--color-text-muted)',
          margin: '0 0 40px 0',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Join thousands of teams using AI to automate their outreach and close more deals.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/auth/signup')}
            className="btn-primary ms-hover-scale ms-press focus-ring glow"
            style={{ padding: '18px 40px', fontSize: '18px', fontWeight: '600' }}
          >
            Start Free Trial
          </button>
          <button
            onClick={() => router.push('/demo')}
            className="btn-ghost ms-hover-scale ms-press focus-ring"
            style={{ padding: '18px 40px', fontSize: '18px', fontWeight: '600' }}
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 24px 40px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '20px' }}>
              <div style={{
                height: '32px',
                width: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Spark AI</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
              AI-powered sales automation platform that helps you scale outreach and close more deals.
            </p>
          </div>
          
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="#features" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Features</Link>
              <Link href="#how-it-works" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>How It Works</Link>
              <Link href="/demo" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Demo</Link>
              <Link href="/pricing" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Pricing</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/about" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>About</Link>
              <Link href="/blog" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Blog</Link>
              <Link href="/careers" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Careers</Link>
              <Link href="/contact" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Contact</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/privacy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Terms of Service</Link>
              <Link href="/security" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Security</Link>
            </div>
          </div>
        </div>
        
        <div style={{
          paddingTop: '40px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>© 2024 Spark AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
