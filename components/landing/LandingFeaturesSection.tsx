import type { LucideIcon } from "lucide-react";
import { BarChart2, Bot, Phone, Plug, Users, Zap } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: "Multi-Channel Campaigns",
    description:
      "Reach leads via Email, LinkedIn, WhatsApp, and AI voice calls from one campaign builder.",
  },
  {
    icon: Bot,
    title: "AI-Personalized Messaging",
    description:
      "Describe your offer and let AI draft personalized messages for every lead automatically.",
  },
  {
    icon: Phone,
    title: "AI Voice Calling",
    description:
      "Configure tone, script, and voice — let AI handle outbound calls while you focus on replies.",
  },
  {
    icon: Users,
    title: "Lead Management",
    description:
      "Import, enrich, and organize contacts in workspaces built for your team's workflow.",
  },
  {
    icon: BarChart2,
    title: "Analytics & Reporting",
    description:
      "Track open rates, replies, call outcomes, and campaign performance in real time.",
  },
  {
    icon: Plug,
    title: "Integrations",
    description:
      "Connect your email, LinkedIn, spreadsheets, and enrichment tools in minutes.",
  },
];

export default function LandingFeaturesSection() {
  return (
    <section
      className="landing-features-section landing-strip landing-strip--b relative overflow-hidden py-[clamp(3.5rem,9vw,5.5rem)] [padding-inline:var(--landing-gutter,clamp(28px,5vw,56px))]"
      id="features"
      aria-labelledby="landing-features-heading"
    >
      {/* Soft background wash — no hard circles */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.85]"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% -15%, color-mix(in srgb, var(--color-primary) 9%, transparent) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 60%, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative z-[1] mx-auto max-w-[1180px]">
        <header className="landing-features-header mx-auto flex max-w-[40rem] flex-col items-center gap-3 text-center md:gap-4">
          <span className="landing-features-kicker inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--color-primary)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
            Everything You Need
          </span>
          <h2
            id="landing-features-heading"
            className="text-balance text-[clamp(1.75rem,4.2vw,2.65rem)] font-bold leading-[1.12] tracking-tight text-[color:var(--color-text)]"
          >
            One Platform. Every Channel. Zero Guesswork.
          </h2>
          <p className="max-w-[36rem] text-pretty text-base leading-relaxed text-[color:var(--color-text-muted)] sm:text-lg">
            Rift Reach brings together lead management, AI messaging, and multi-channel outreach so your team can focus on
            closing — not clicking.
          </p>
        </header>

        <ul className="landing-features-grid mt-10 grid list-none grid-cols-1 gap-5 p-0 sm:mt-12 md:grid-cols-2 md:gap-6 lg:mt-14 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="h-full min-h-0">
              <article className="landing-feature-card group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[color:color-mix(in_srgb,var(--color-border)_90%,var(--color-primary)_10%)] bg-[color:var(--color-surface)] p-0 shadow-[0_1px_0_color-mix(in_srgb,var(--color-primary)_6%,transparent),0_16px_40px_color-mix(in_srgb,var(--color-text)_4%,transparent)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:shadow-[0_1px_0_color-mix(in_srgb,var(--color-primary)_12%,transparent),0_22px_48px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
                <div
                  className="h-1 w-full shrink-0 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--color-primary)_88%,white)] to-[color:color-mix(in_srgb,var(--color-accent)_82%,white)]"
                  aria-hidden
                />
                <div className="flex flex-1 flex-col px-6 pb-7 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
                  <div
                    className="mb-5 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[1.05rem] bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_16%,transparent)] to-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-surface)_45%,transparent),0_10px_24px_color-mix(in_srgb,var(--color-primary)_14%,transparent)] transition-transform duration-300 group-hover:scale-[1.04]"
                    aria-hidden
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="feature-title text-lg font-semibold leading-snug tracking-tight text-[color:var(--color-text)] sm:text-[1.125rem]">
                    {title}
                  </h3>
                  <p className="feature-desc mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[color:var(--color-text-muted)]">
                    {description}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
