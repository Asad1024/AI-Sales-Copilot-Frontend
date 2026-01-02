"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5,000 leads",
        "10,000 emails/month",
        "5 active campaigns",
        "AI lead generation",
        "Email + LinkedIn",
        "Basic analytics",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$299",
      period: "/month",
      description: "For growing sales teams",
      features: [
        "Up to 25,000 leads",
        "50,000 emails/month",
        "Unlimited campaigns",
        "AI lead generation",
        "All channels (Email, LinkedIn, WhatsApp, Calls)",
        "Advanced analytics",
        "AI optimization",
        "Priority support",
        "CRM integrations"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations",
      features: [
        "Unlimited leads",
        "Unlimited sends",
        "Unlimited campaigns",
        "Custom AI models",
        "All channels",
        "Advanced analytics & reporting",
        "Dedicated account manager",
        "24/7 support",
        "Custom integrations",
        "SLA guarantee",
        "On-premise option"
      ],
      popular: false
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)',
      padding: '40px 24px 80px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
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
            <span style={{
              fontSize: '20px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Spark AI</span>
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
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Choose the plan that fits your needs. All plans include 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          marginBottom: '80px'
        }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              className="card-enhanced"
              style={{
                padding: '40px 32px',
                borderRadius: '24px',
                border: plan.popular ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                position: 'relative',
                background: plan.popular 
                  ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)'
                  : 'var(--color-surface)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  color: '#000',
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  Most Popular
                </div>
              )}
              
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
                  {plan.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '48px', fontWeight: '800', color: '#4C67FF' }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {plan.features.map((feature, j) => (
                  <li key={j} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '15px'
                  }}>
                    <span style={{ color: '#4C67FF', fontSize: '20px' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push('/auth/signup')}
                className={plan.popular ? 'btn-primary' : 'btn-ghost'}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Start Free Trial
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                q: "Do you offer a free trial?",
                a: "Yes! All plans include a 14-day free trial. No credit card required."
              },
              {
                q: "Can I change plans later?",
                a: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and bank transfers for Enterprise plans."
              },
              {
                q: "Is there a setup fee?",
                a: "No setup fees for Starter and Professional plans. Enterprise plans may include onboarding assistance."
              }
            ].map((faq, i) => (
              <div key={i} className="card-enhanced" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                  {faq.q}
                </h4>
                <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

