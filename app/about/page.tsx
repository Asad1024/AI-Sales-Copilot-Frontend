"use client";
import Link from "next/link";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

export default function AboutPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)',
      padding: '40px 24px 80px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '60px'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <AppBrandLogoLockup height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/auth/login" className="btn-ghost">Log in</Link>
            <Link href="/auth/signup" className="btn-primary">Get Started</Link>
          </div>
        </header>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: '800',
            margin: '0 0 24px 0',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            About Leads Reach
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--color-text-muted)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.7' }}>
            We're building the future of sales automation, making AI-powered outreach accessible to teams of all sizes.
          </p>
        </div>

        {/* Mission */}
        <div className="card-enhanced" style={{ padding: '60px', marginBottom: '60px', borderRadius: '24px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 24px 0' }}>
            Our Mission
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', lineHeight: '1.8', margin: 0 }}>
            At Leads Reach, we believe that every sales team deserves access to enterprise-grade AI tools. 
            Our mission is to democratize AI-powered sales automation, helping businesses of all sizes 
            scale their outreach, find better leads, and close more deals—without the complexity.
          </p>
        </div>

        {/* Values */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', textAlign: 'center', marginBottom: '40px' }}>
            Our Values
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            {[
              {
                title: 'Innovation',
                desc: 'We continuously push the boundaries of what AI can do for sales teams, always staying ahead of the curve.',
                icon: '💡'
              },
              {
                title: 'Simplicity',
                desc: 'Complex problems deserve simple solutions. We make powerful AI accessible through intuitive design.',
                icon: '✨'
              },
              {
                title: 'Transparency',
                desc: 'No black boxes. You always know what the AI is doing and why, giving you full control.',
                icon: '🔍'
              },
              {
                title: 'Results',
                desc: 'We measure success by your success. Every feature we build is designed to help you close more deals.',
                icon: '🎯'
              }
            ].map((value, i) => (
              <div key={i} className="card-enhanced" style={{ padding: '32px', borderRadius: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{value.icon}</div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 12px 0' }}>
                  {value.title}
                </h3>
                <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%)',
          borderRadius: '24px'
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 16px 0' }}>
            Join Us on This Journey
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', margin: '0 0 32px 0' }}>
            Ready to transform your sales process? Start your free trial today.
          </p>
          <Link href="/auth/signup" className="btn-primary" style={{ padding: '16px 32px', fontSize: '16px' }}>
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}

