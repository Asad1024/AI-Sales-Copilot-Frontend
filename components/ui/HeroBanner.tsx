"use client";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section
      className="hero-spotlight"
      style={{
        position: "relative",
        borderRadius: "20px",
        padding: "28px",
        border: "1px solid var(--elev-border)",
        background:
          "linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb),0.08) 100%)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(600px 220px at 20% -10%, rgba(var(--color-primary-rgb), 0.2) 0%, transparent 60%), radial-gradient(600px 220px at 90% 0%, rgba(var(--color-primary-rgb),0.20) 0%, transparent 60%)",
          filter: "blur(30px)",
          opacity: 0.65,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "20px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid var(--elev-border)", background: "var(--elev-bg)", fontSize: 12 }}>
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>New</span>
            <span>Editable AI Plan is live</span>
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 24, fontWeight: 700, lineHeight: 1.25 }}>
            Accelerate outreach with Leads Reach
          </h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
            Plan, launch and optimize omni‑channel campaigns in minutes.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Link 
              href="/flow/new-goal" 
              className="start-flow-btn"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 20px rgba(var(--color-primary-rgb), 0.2), 0 0 0 0 rgba(var(--color-primary-rgb), 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget;
                btn.style.transform = 'translateY(-2px) scale(1.02)';
                btn.style.boxShadow = '0 8px 32px rgba(var(--color-primary-rgb), 0.2), 0 0 0 4px rgba(var(--color-primary-rgb), 0.2)';
                const arrow = btn.querySelector('.flow-arrow') as HTMLElement;
                if (arrow) arrow.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget;
                btn.style.transform = 'translateY(0) scale(1)';
                btn.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb), 0.2), 0 0 0 0 rgba(var(--color-primary-rgb), 0.2)';
                const arrow = btn.querySelector('.flow-arrow') as HTMLElement;
                if (arrow) arrow.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                Start new flow
                <span 
                  className="flow-arrow"
                  style={{ 
                    display: 'inline-block',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >→</span>
              </span>
            </Link>
            <Link href="/demo" className="btn-ghost" style={{ padding: "10px 14px", borderRadius: 10 }}>
              Watch demo
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(110px, 1fr))", gap: 12, minWidth: 330, flex: 1, justifyContent: "flex-end" }}>
          <StatChip label="Leads optimized" value="12.4K" />
          <StatChip label="Reply rate" value="11.4%" accent="var(--color-primary)" />
          <StatChip label="AI score" value="92%" accent="#F29F67" />
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value, accent = "rgba(var(--color-primary-rgb), 0.2)" }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="chip-card"
      style={{
        borderRadius: 14,
        padding: 14,
        background: "var(--elev-bg)",
        border: "1px solid var(--elev-border)",
        boxShadow: "var(--elev-shadow)",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
        <span style={{ height: 8, minWidth: 8, borderRadius: 999, background: accent }} />
      </div>
    </div>
  );
}


