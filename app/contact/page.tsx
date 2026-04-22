"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";
import LandingMarketingNav from "@/components/landing/LandingMarketingNav";
import "../upgrade/upgrade-page.css";

export default function ContactPage() {
  const { showSuccess } = useNotification();
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const toggleAppearance = useCallback(() => {
    setAppearance((v) => (v === "light" ? "dark" : "light"));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess("Message sent", "Thank you for your message! We'll get back to you soon.");
    setFormData({ name: "", email: "", company: "", message: "" });
  };

  return (
    <div className={`upgrade-fullpage landing-page${appearance === "light" ? " landing-theme-light" : ""}`}>
      <LandingMarketingNav
        cta="signup"
        appearance={appearance}
        onToggleAppearance={toggleAppearance}
        links="app"
        showLogin
      />
      <main className="upgrade-fullpage__main">
        <header className="upgrade-fullpage__hero">
          <p className="upgrade-fullpage__kicker">Contact</p>
          <h1 className="upgrade-fullpage__title">Get in touch</h1>
          <p className="upgrade-fullpage__lead">
            Questions, demos, or partnerships — send a note and we&apos;ll respond as soon as we can.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "clamp(24px, 4vw, 40px)",
            maxWidth: 1000,
            margin: "0 auto",
          }}
        >
          <div>
            <div className="card-enhanced" style={{ padding: 32, marginBottom: 24, borderRadius: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px" }}>Contact information</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { icon: "📧", label: "Email", value: "hello@riftreach.com" },
                  { icon: "💬", label: "Support", value: "support@riftreach.com" },
                  { icon: "🌐", label: "Website", value: "www.riftreach.com" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 24 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{row.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-enhanced" style={{ padding: 32, borderRadius: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Office hours</h3>
              <p style={{ fontSize: 15, color: "var(--color-text-muted)", margin: "0 0 12px" }}>
                Monday – Friday
                <br />
                9:00 AM – 6:00 PM EST
              </p>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>
                We typically respond within 24 hours.
              </p>
            </div>
          </div>

          <div className="card-enhanced" style={{ padding: 40, borderRadius: 20 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px" }}>Send us a message</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  Company (optional)
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Message</label>
                <textarea
                  className="input"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontSize: 16, fontWeight: 600 }}>
                Send message
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 48, marginBottom: 0 }}>
          <Link href="/" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
