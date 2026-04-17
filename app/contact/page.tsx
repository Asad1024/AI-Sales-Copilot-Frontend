"use client";
import { useState } from "react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";
import { AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

export default function ContactPage() {
  const { showSuccess } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send to API
    showSuccess('Message sent', "Thank you for your message! We'll get back to you soon.");
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)',
      padding: '40px 24px 80px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '60px'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <AppBrandLogoLockup height={36} style={{ maxWidth: 180 }} />
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/auth/login" className="btn-ghost">Log in</Link>
            <Link href="/auth/signup" className="btn-primary">Get Started</Link>
          </div>
        </header>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: '800',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Get in Touch
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px'
        }}>
          {/* Contact Info */}
          <div>
            <div className="card-enhanced" style={{ padding: '32px', marginBottom: '24px', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 24px 0' }}>
                Contact Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: '📧', label: 'Email', value: 'hello@outriva.com' },
                  { icon: '💬', label: 'Support', value: 'support@outriva.com' },
                  { icon: '🌐', label: 'Website', value: 'www.outriva.com' }
                ].map((contact, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px' }}>{contact.icon}</div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                        {contact.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {contact.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-enhanced" style={{ padding: '32px', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 16px 0' }}>
                Office Hours
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>
                Monday - Friday<br />
                9:00 AM - 6:00 PM EST
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                We typically respond within 24 hours.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card-enhanced" style={{ padding: '40px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 24px 0' }}>
              Send us a Message
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Company (optional)
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Message
                </label>
                <textarea
                  className="input"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: '600' }}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

