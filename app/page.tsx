"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";
import { APP_BRAND_META_DESCRIPTION } from "@/lib/brand";
import SalesCopilotPricingSection from "@/components/pricing/SalesCopilotPricingSection";
import LandingThemeToggle from "@/components/ui/LandingThemeToggle";
import LandingHero from "@/components/landing/LandingHero";
import {
  LandingCompanyPreviewBody,
  LandingCompanyPreviewProvider,
  LandingCompanyPreviewSearchInput,
} from "@/components/landing/LandingCompanyPreviewShell";
import LandingFeaturesSection from "@/components/landing/LandingFeaturesSection";
import { RevealOnView } from "@/components/ui/RevealOnView";
import { CRMLogos } from "@/components/ui/CRMLogos";
import { GoogleSheetsBrandIcon, AirtableBrandIcon } from "@/app/leads/components/LeadSourceBrandIcons";
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

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Testimonial card
function TestimonialCard({
  name,
  role,
  company,
  quote,
  avatar: _avatar,
  tintIndex,
}: {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
  tintIndex: number;
}) {
  const ti = tintIndex % 3;
  return (
    <RevealOnView className="testimonial-card">
      <div className="testimonial-quote">
        <svg className="testimonial-quote-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
        </svg>
        <p>{quote}</p>
      </div>
      <div className="testimonial-author">
        <div className={`author-avatar author-avatar--t${ti} flex shrink-0 items-center justify-center`}>
          <span className="font-semibold text-sm text-white">{initialsFromName(name)}</span>
        </div>
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
    </RevealOnView>
  );
}

// Platform Icons for Integrations
/** Sales / marketing brands — Simple Icons CDN (official brand SVGs); >6 enables marquee */
const TRUSTED_BY_BRANDS: { name: string; slug: string; color?: string }[] = [
  { name: "Stripe", slug: "stripe" },
  { name: "HubSpot", slug: "hubspot" },
  { name: "Notion", slug: "notion" },
  { name: "Figma", slug: "figma" },
  { name: "Vercel", slug: "vercel", color: "000000" },
  { name: "Linear", slug: "linear", color: "222326" },
  { name: "Loom", slug: "loom" },
];

function TrustedByLogoCell({
  name,
  slug,
  color,
}: {
  name: string;
  slug: string;
  color?: string;
}) {
  const src = color ? `https://cdn.simpleicons.org/${slug}/${color}` : `https://cdn.simpleicons.org/${slug}`;
  return (
    <div className="trust-logo-cell">
      <div className="trust-logo-img-wrap">
        <img
          className="trust-logo-img"
          src={src}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="trust-logo-caption">{name}</span>
    </div>
  );
}

/** Channel colors + icon sizes match `app/settings/IntegrationsHub.tsx` (portal Integrations page). */
const WIZ_CHANNEL_LINKEDIN = "#0077B5";
const WIZ_CHANNEL_WHATSAPP = "#25D366";

function LandingIntegrationWhatsApp() {
  return <Icons.WhatsApp size={22} style={{ color: WIZ_CHANNEL_WHATSAPP }} aria-hidden />;
}
function LandingIntegrationLinkedIn() {
  return <Icons.Linkedin size={22} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_LINKEDIN }} aria-hidden />;
}
function LandingIntegrationGoogleSheets() {
  return <GoogleSheetsBrandIcon size={24} />;
}
function LandingIntegrationAirtable() {
  return <AirtableBrandIcon size={24} />;
}
function LandingIntegrationHubSpot() {
  return <CRMLogos.HubSpot size={24} />;
}

const INTEGRATION_ITEMS: { name: string; Icon: ComponentType }[] = [
  { name: "WhatsApp", Icon: LandingIntegrationWhatsApp },
  { name: "LinkedIn", Icon: LandingIntegrationLinkedIn },
  { name: "Google Sheets", Icon: LandingIntegrationGoogleSheets },
  { name: "Airtable", Icon: LandingIntegrationAirtable },
  { name: "HubSpot", Icon: LandingIntegrationHubSpot },
];

// Integration card with icon
function IntegrationCard({
  name,
  icon,
  reveal = true,
}: {
  name: string;
  icon: ReactNode;
  reveal?: boolean;
}) {
  const inner = (
    <>
      <div className="integration-icon">{icon}</div>
      <span className="integration-name">{name}</span>
    </>
  );
  return reveal ? (
    <RevealOnView className="integration-card">{inner}</RevealOnView>
  ) : (
    <div className="integration-card">{inner}</div>
  );
}

// FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const answerId = useId();

  return (
    <RevealOnView className={`faq-item ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="faq-question"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{question}</span>
        <div className="faq-toggle">
          {isOpen ? <Icons.ChevronUp size={20} /> : <Icons.ChevronDown size={20} />}
        </div>
      </button>
      <div id={answerId} className="faq-answer" style={{ maxHeight: isOpen ? "min(1200px, 200vh)" : "0" }}>
        <p>{answer}</p>
      </div>
    </RevealOnView>
  );
}

const LANDING_THEME_STORAGE_KEY = "spark-landing-theme";

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [landingAppearance, setLandingAppearance] = useState<"light" | "dark">("light");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const landingStored = localStorage.getItem(LANDING_THEME_STORAGE_KEY);
      const appStored = localStorage.getItem("spark-theme");
      const resolvedTheme =
        landingStored === "dark" || landingStored === "light"
          ? landingStored
          : appStored === "dark" || appStored === "light"
            ? appStored
            : "light";
      setLandingAppearance(resolvedTheme);
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      localStorage.setItem(LANDING_THEME_STORAGE_KEY, resolvedTheme);
      localStorage.setItem("spark-theme", resolvedTheme);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLandingAppearance = () => {
    setLandingAppearance((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(LANDING_THEME_STORAGE_KEY, next);
        localStorage.setItem("spark-theme", next);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };
  
  // Redirect authenticated users to dashboard - temporarily disabled for preview
  // useEffect(() => {
  //   if (isAuthenticated()) {
  //     router.push('/dashboard');
  //   }
  // }, [router]);

  /** Full reload / refresh / bfcache often restore a non-zero scroll; keep viewport at exact top unless there is a hash. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;

    const prevRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const raf = window.requestAnimationFrame(() => {
      scrollTop();
      window.requestAnimationFrame(scrollTop);
    });
    const timeouts = [0, 50, 120, 280].map((ms) => window.setTimeout(scrollTop, ms));

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scrollTop();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.cancelAnimationFrame(raf);
      timeouts.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("pageshow", onPageShow);
      window.history.scrollRestoration = prevRestoration;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollY(currentScrollY);
      setScrollProgress(scrollableHeight > 0 ? Math.min(currentScrollY / scrollableHeight, 1) : 0);
    };
    handleScroll();
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

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'VP of Sales',
      company: 'TechCorp',
      quote: "Outriva transformed our outbound process. We went from 50 meetings/month to 200+ while our team actually got smaller. The AI personalization is incredible.",
      avatar: '#2563EB'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Growth Lead',
      company: 'ScaleUp',
      quote: "The multi-channel orchestration is a game-changer. Our reply rates jumped 4x because prospects hear from us on their preferred channel at the right time.",
      avatar: '#1D4ED8'
    },
    {
      name: 'Emma Watson',
      role: 'SDR Manager',
      company: 'CloudBase',
      quote: "My team of 5 SDRs now outperforms teams of 20. The AI handles the grunt work while we focus on actual conversations and closing deals.",
      avatar: '#0EA5E9'
    }
  ];

  const faqs = [
    {
      question: "How does the AI lead generation work?",
      answer:
        "Simply describe your ideal customer in natural language, like 'SaaS companies with 50-200 employees in fintech', and our AI searches millions of data points to find matching prospects. We enrich each lead with verified emails, phone numbers, company data, and intent signals.",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "Yes! We offer a 14-day free trial with full access to all features. No credit card required. You can generate up to 1,000 leads and send 500 emails during your trial to see real results.",
    },
    {
      question: "How does Outriva prevent emails from going to spam?",
      answer:
        "We use AI-powered deliverability optimization including inbox warming, domain health monitoring, sending pattern analysis, and content optimization. Our customers see 98%+ inbox placement rates.",
    },
    {
      question: "Can I import my existing leads?",
      answer:
        "Absolutely! Import from CSV, Excel, your CRM (Salesforce, HubSpot, Pipedrive), or any other source. We'll automatically enrich and score your existing database with fresh data.",
    },
    {
      question: "What integrations are available?",
      answer:
        "Outriva integrates with all major CRMs (Salesforce, HubSpot, Pipedrive, Zoho), email providers (Gmail, Outlook, SMTP), LinkedIn, Slack, Zapier, and 100+ other tools via our API.",
    },
  ];
  
  return (
    <div className={`landing-page${landingAppearance === "light" ? " landing-theme-light" : ""}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        .landing-page {
          --landing-gutter: clamp(28px, 5vw, 56px);
          /* Fixed floating nav + safe area — keeps hero badge/copy below the bar */
          --landing-nav-clearance: max(8rem, calc(env(safe-area-inset-top, 0px) + 6.75rem));
          --landing-heading-weight: 500;
          --landing-ui-weight: 500;
          --gradient-primary: #2563EB;
          --gradient-dark: #0a0a0f;
          --gradient-card: rgba(255,255,255,0.04);
          --glass-bg: linear-gradient(165deg, rgba(24, 34, 56, 0.5), rgba(8, 12, 20, 0.5));
          --glass-border: rgba(255, 255, 255, 0.1);
          --card-shadow: 0 18px 50px rgba(2, 10, 32, 0.38);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          position: relative;
          isolation: isolate;
          background: radial-gradient(circle at top, #0d1527 0%, #050508 48%, #030306 100%);
          color: #fff;
          overflow-x: hidden;
          /* Avoid browser scroll anchoring shifting the page when fonts/images settle */
          overflow-anchor: none;
        }
        .landing-page :is(
            button,
            .pricing-cta,
            .nav-link,
            .btn-login,
            .btn-cta,
            .btn-hero-primary,
            .btn-hero-secondary,
            .btn-secondary-outline
          ) {
          font-weight: var(--landing-ui-weight);
          letter-spacing: 0.02em;
        }
        .landing-page :is(h1, h2, h3, h4) {
          font-weight: var(--landing-heading-weight);
        }
        .landing-page::before,
        .landing-page::after {
          content: "";
          position: fixed;
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
          opacity: 0.42;
          animation: aurora-drift 16s ease-in-out infinite alternate;
        }
        .landing-page::before {
          width: 40vw;
          height: 40vw;
          min-width: 320px;
          min-height: 320px;
          top: -12vw;
          left: -8vw;
          background: radial-gradient(circle at 30% 30%, rgba(37, 99, 235, 0.5), rgba(37, 99, 235, 0));
        }
        .landing-page::after {
          width: 36vw;
          height: 36vw;
          min-width: 280px;
          min-height: 280px;
          bottom: -14vw;
          right: -8vw;
          background: radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.4), rgba(6, 182, 212, 0));
          animation-delay: 2s;
        }
        @keyframes aurora-drift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(2vw, -1vw, 0) scale(1.08); }
        }
        .landing-page > :not(style):not(.scroll-progress):not(.landing-header):not(.landing-mobile-overlay):not(.landing-mobile-panel) {
          position: relative;
          z-index: 1;
        }

        /* Hero: one soft background layer (LandingHero landing-hero-bg) */
        .landing-hero-bg {
          background:
            radial-gradient(ellipse 100% 85% at 72% -8%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 52%),
            linear-gradient(180deg, var(--color-background) 0%, color-mix(in srgb, var(--color-surface-secondary) 100%, var(--color-background)) 100%);
        }

        /* Undo globals.css input border/shadow so the hero search is one bordered shell (icon + field). */
        .landing-page .landing-hero-search-input {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          transition: none;
        }
        .landing-page .landing-hero-search-input:focus {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        .landing-company-preview-card {
          border-radius: 18px;
          border: 1px solid var(--color-border-light);
          background: transparent;
          box-shadow: none;
          padding: 20px 22px;
        }
        .landing-company-preview-split {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        @media (min-width: 640px) {
          .landing-company-preview-split {
            flex-direction: row;
            align-items: stretch;
            gap: 0;
          }
          .landing-company-preview-split__left {
            flex: 1 1 0;
            min-width: 0;
            padding-right: 20px;
          }
          .landing-company-preview-split__divider {
            flex: 0 0 1px;
            align-self: stretch;
            min-height: 120px;
            background: rgba(148, 163, 184, 0.35);
          }
          .landing-company-preview-split__right {
            flex: 1 1 0;
            min-width: 0;
            padding-left: 20px;
          }
        }
        @media (max-width: 639px) {
          .landing-company-preview-split__divider {
            display: none;
          }
          .landing-company-preview-split__right {
            padding-top: 4px;
            border-top: 1px solid rgba(148, 163, 184, 0.28);
          }
        }

        .landing-company-preview-reset:hover {
          background: rgba(255, 255, 255, 0.95) !important;
          color: var(--color-text) !important;
          border-color: rgba(37, 99, 235, 0.35) !important;
        }

        .landing-team-results-link {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
        }
        .landing-team-results-text {
          color: var(--color-text);
        }
        .landing-team-results-link:hover .landing-team-results-text {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .landing-team-results-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--color-text-muted);
          overflow: hidden;
          transition:
            color 0.28s ease,
            opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            max-width 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
          opacity: 0;
          max-width: 0;
          transform: translateX(-8px);
        }
        .landing-team-results-link[data-arrow-revealed="true"] .landing-team-results-arrow {
          opacity: 1;
          max-width: 22px;
          transform: translateX(0);
        }
        .landing-team-results-link:hover .landing-team-results-arrow {
          color: #2563eb;
        }

        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          transform-origin: left center;
          background: linear-gradient(90deg, #2563EB, #06B6D4);
          z-index: 140;
          transition: transform 0.18s ease-out;
        }

        [data-reveal] {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          transition-delay: var(--reveal-delay, 0ms);
        }
        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Header — floating pill, softer than full-width bar */
        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px var(--landing-gutter) 12px;
          display: block;
          z-index: 100;
          background: transparent;
          transition: all 0.3s ease;
        }
        .header-scrolled {
          padding: 16px var(--landing-gutter) 10px;
        }
        .landing-header .landing-header-inner {
          max-width: min(1180px, 100%);
          margin-left: auto;
          margin-right: auto;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.88) 0%, rgba(2, 6, 23, 0.78) 100%);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 9999px;
          padding: 10px 20px 10px 18px;
          box-shadow: 0 8px 32px rgba(2, 6, 23, 0.35), 0 1px 0 rgba(255, 255, 255, 0.06) inset;
          backdrop-filter: blur(18px);
          transition: all 0.3s ease;
        }
        .landing-header.header-scrolled .landing-header-inner {
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.9) 0%, rgba(2, 6, 23, 0.8) 100%);
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 6px 28px rgba(2, 6, 23, 0.32);
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        /* Product mark: AppBrandLogoMark (keeps landing + app shell in sync) */
        .logo-text {
          font-size: 22px;
          font-weight: var(--landing-heading-weight);
          background: #2563EB;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }
        .nav-links {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .nav-link {
          color: rgba(226, 232, 240, 0.92);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
          position: relative;
          padding: 10px 16px;
          border-radius: 999px;
        }
        .nav-link:hover {
          color: #fff;
          background: rgba(37, 99, 235, 0.2);
        }
        .nav-buttons {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .landing-header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .btn-login {
          padding: 11px 22px;
          color: #fff;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.32);
          border-radius: 9999px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-login:hover {
          background: rgba(30, 41, 59, 0.86);
          border-color: rgba(191, 219, 254, 0.62);
        }
        .btn-cta {
          padding: 11px 26px;
          color: #fff;
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 9999px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
        }
        .btn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.5);
        }

        /* Connected trust band: stats + logos (below hero) */
        .landing-trust-band {
          width: 100%;
          margin-top: 0;
          box-sizing: border-box;
          border: none;
          padding: 0 0 8px;
          background: transparent;
        }
        .trust-band-inner {
          max-width: min(1120px, 100%);
          width: 100%;
          margin: 0 auto;
          padding: 0 var(--landing-gutter);
          box-sizing: border-box;
        }
        .trust-band-card {
          border-radius: 20px;
          border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
          background: color-mix(in srgb, var(--color-surface) 96%, var(--color-primary) 4%);
          box-shadow:
            0 1px 0 color-mix(in srgb, var(--color-primary) 8%, transparent),
            0 18px 40px color-mix(in srgb, var(--color-text) 6%, transparent);
          overflow: hidden;
        }
        .trust-stats-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: 100%;
          margin: 0 auto;
          padding: 22px 16px 18px;
          gap: 0;
          align-items: stretch;
          animation: fade-in-up 0.55s ease 0.2s forwards;
          opacity: 0;
        }
        .trust-stat-cell {
          position: relative;
          text-align: center;
          padding: 8px 12px 12px;
          min-width: 0;
        }
        .trust-stat-cell:not(:first-child)::before {
          content: "";
          position: absolute;
          left: 0;
          top: 22%;
          bottom: 22%;
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent,
            color-mix(in srgb, var(--color-border) 75%, transparent) 20%,
            color-mix(in srgb, var(--color-border) 75%, transparent) 80%,
            transparent
          );
        }
        .trust-stat-value {
          font-size: clamp(30px, 3.6vw, 42px);
          font-weight: 600;
          line-height: 1.1;
          color: var(--color-primary);
          font-variant-numeric: tabular-nums;
        }
        .trust-stat-label {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: var(--color-text-muted);
        }
        .trust-logos-block {
          border-top: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
          padding: 18px 16px 22px;
          background: transparent;
        }
        .trust-band-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          text-align: center;
          opacity: 0.88;
        }
        .trust-logo-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          min-width: 72px;
          flex-shrink: 0;
        }
        .trust-logo-img-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          width: 56px;
        }
        .trust-logo-img {
          max-height: 36px;
          max-width: 44px;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        .trust-logo-img.trust-logo-img--inline {
          display: block;
        }
        .trust-logo-caption {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: color-mix(in srgb, var(--color-text) 72%, transparent);
          text-align: center;
          line-height: 1.2;
          max-width: 88px;
        }
        .trust-logos-static {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 28px 36px;
        }
        .trust-marquee-outer {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .trust-marquee-track {
          display: flex;
          width: max-content;
          gap: 48px;
          align-items: flex-start;
          padding: 6px 0 4px;
          animation: trust-marquee 48s linear infinite;
        }
        @keyframes trust-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .trust-marquee-track {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            transform: none;
          }
        }
        .btn-hero-primary {
          padding: 14px 28px;
          font-size: 16px;
          color: #fff;
          background: #2563EB;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }
        .btn-hero-primary:hover {
          transform: translateY(-1px);
          background: #1d4ed8;
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.42);
        }
        .btn-hero-secondary {
          padding: 18px 36px;
          font-size: 16px;
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

        /* One continuous page canvas — strips don’t repaint a second band color */
        .landing-strip {
          width: 100%;
          box-sizing: border-box;
        }
        .landing-strip--a,
        .landing-strip--b {
          background: transparent;
        }

        /* Video Section */
        .video-section {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 48px var(--landing-gutter) 64px;
          box-sizing: border-box;
        }
        .video-section > * {
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .video-section > .video-section-embed {
          max-width: min(640px, 100%);
        }
        .section-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .section-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 100px;
          font-size: 12px;
          font-weight: var(--landing-heading-weight);
          color: #06B6D4;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .section-title {
          font-size: clamp(36px, 5vw, 52px);
          font-weight: var(--landing-heading-weight);
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
          background: #111827;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .video-gradient-overlay {
          position: absolute;
          inset: 0;
          background: rgba(37, 99, 235, 0.16);
        }
        .video-play-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: #2563EB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 8px 32px rgba(37, 99, 235, 0.5);
          z-index: 3;
        }
        .video-play-btn:hover {
          transform: translate(-50%, -50%) scale(1.08);
          box-shadow: 0 10px 36px rgba(37, 99, 235, 0.55);
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
          font-weight: var(--landing-heading-weight);
        }
        .video-duration {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
        .video-shimmer {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.03);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* How It Works */
        .how-section {
          position: relative;
          padding-top: 80px;
          padding-bottom: 80px;
          overflow: hidden;
        }
        .how-section::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 90% 55% at 50% -10%,
            color-mix(in srgb, var(--color-primary) 10%, transparent) 0%,
            transparent 58%
          );
        }
        .how-container {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          width: 100%;
        }
        .how-section-header.section-header {
          text-align: center;
          max-width: 36rem;
          margin-left: auto;
          margin-right: auto;
        }
        .how-section-header .section-subtitle {
          max-width: 28rem;
          margin-left: auto;
          margin-right: auto;
        }
        .steps-grid-wrap {
          width: 100%;
          margin-top: 36px;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(1.25rem, 3.5vw, 2rem);
          align-items: stretch;
        }
        .step-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1.5rem 2.15rem;
          border-radius: 22px;
          background: var(--color-surface);
          border: 1px solid color-mix(in srgb, var(--color-border) 88%, var(--color-primary) 12%);
          box-shadow:
            0 1px 0 color-mix(in srgb, var(--color-primary) 8%, transparent),
            0 18px 44px color-mix(in srgb, var(--color-text) 5%, transparent);
          overflow: hidden;
          transition:
            transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.28s ease,
            box-shadow 0.28s ease;
        }
        @media (min-width: 1025px) {
          .step-card--mid {
            border-color: color-mix(in srgb, var(--color-primary) 32%, var(--color-border));
            box-shadow:
              0 1px 0 color-mix(in srgb, var(--color-primary) 12%, transparent),
              0 22px 52px color-mix(in srgb, var(--color-primary) 14%, transparent);
          }
        }
        .step-card:hover {
          transform: translateY(-6px);
          border-color: color-mix(in srgb, var(--color-primary) 38%, var(--color-border));
          box-shadow:
            0 1px 0 color-mix(in srgb, var(--color-primary) 14%, transparent),
            0 24px 48px color-mix(in srgb, var(--color-primary) 18%, transparent);
        }
        .step-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.15rem;
          padding: 0.4rem 0.95rem;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 11%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
          border-radius: 9999px;
        }
        .step-icon-wrap {
          margin-bottom: 1.2rem;
        }
        .step-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
          box-shadow: none;
        }
        .step-title {
          font-size: clamp(1.125rem, 2vw, 1.35rem);
          font-weight: 600;
          margin: 0 0 0.65rem;
          line-height: 1.28;
          color: var(--color-text);
        }
        .step-desc {
          font-size: 15px;
          line-height: 1.65;
          margin: 0;
          max-width: 34ch;
          color: var(--color-text-muted);
        }

        /* Testimonials — light band (matches features surface) */
        .testimonials-band {
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid var(--color-border-light);
        }
        .testimonials-inner {
          box-sizing: border-box;
          max-width: 1400px;
          margin: 0 auto;
          padding-top: 80px;
          padding-bottom: 80px;
        }
        .testimonials-band .section-title {
          color: var(--color-text);
        }
        .testimonials-band .section-subtitle {
          color: var(--color-text-muted);
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          margin-top: 40px;
          width: 100%;
          min-width: 0;
        }
        .testimonials-band .testimonial-card {
          padding: 32px;
          min-width: 0;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          box-shadow: var(--elev-shadow);
          transition:
            transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }
        .testimonials-band .testimonial-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          box-shadow: var(--elev-shadow-lg);
        }
        .testimonial-quote {
          position: relative;
          margin-bottom: 24px;
        }
        .testimonial-quote-icon {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 2.25rem;
          height: 2.25rem;
          max-width: 2.25rem;
          max-height: 2.25rem;
          color: var(--color-primary);
          opacity: 0.27;
        }
        .testimonials-band .testimonial-quote p {
          font-size: 15px;
          line-height: 1.8;
          color: color-mix(in srgb, var(--color-text) 78%, transparent);
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
        .testimonials-band .author-avatar--t0 {
          background: color-mix(in srgb, var(--color-primary) 88%, var(--color-text) 12%);
        }
        .testimonials-band .author-avatar--t1 {
          background: color-mix(in srgb, var(--color-primary) 72%, var(--color-accent) 28%);
        }
        .testimonials-band .author-avatar--t2 {
          background: color-mix(in srgb, var(--color-primary) 48%, var(--color-accent) 52%);
        }
        .author-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .testimonials-band .author-name {
          font-size: 15px;
          font-weight: var(--landing-heading-weight);
          color: var(--color-text);
        }
        .testimonials-band .author-role {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .testimonial-stars {
          display: flex;
          gap: 4px;
          color: #FFD93D;
        }

        /* Integrations — light band + compact cards (desktop grid / mobile marquee) */
        .integrations-band {
          width: 100%;
          box-sizing: border-box;
        }
        .integrations-inner {
          box-sizing: border-box;
          max-width: 1400px;
          margin: 0 auto;
          padding-top: 64px;
          padding-bottom: 40px;
          text-align: center;
        }
        .integrations-band .section-title {
          color: var(--color-text);
        }
        .integrations-band .section-subtitle {
          color: var(--color-text-muted);
        }
        .integrations-grid-desktop {
          display: grid;
          grid-template-columns: repeat(5, minmax(96px, 108px));
          gap: 12px 14px;
          justify-content: center;
          justify-items: center;
          margin-top: 28px;
          width: 100%;
        }
        .integrations-band .integration-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
          width: 100%;
          max-width: 110px;
          min-width: 0;
          padding: 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          box-shadow: var(--elev-shadow);
          transition:
            transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.25s ease;
        }
        .integrations-band .integration-card:hover {
          transform: scale(1.05);
          box-shadow: var(--elev-shadow-lg);
        }
        /* Match IntegrationsHub / IntegrationUniversalCard icon tile: 44×44 shell, 24×24 mark */
        .integration-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          background: var(--color-surface-secondary);
          border: 1px solid rgba(148, 163, 184, 0.14);
          box-sizing: border-box;
        }
        .integration-icon :is(svg, img) {
          width: 24px;
          height: 24px;
          display: block;
          flex-shrink: 0;
        }
        .integrations-band .integration-name {
          font-size: 12px;
          font-weight: 500;
          line-height: 1.25;
          color: var(--color-text);
        }
        .integrations-marquee-outer {
          overflow: hidden;
          width: 100%;
          margin-top: 24px;
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .integrations-marquee-track {
          display: flex;
          width: max-content;
          gap: 14px;
          align-items: stretch;
          padding: 4px 0 8px;
          animation: integrations-marquee 40s linear infinite;
        }
        .integrations-marquee-track .integration-card {
          flex-shrink: 0;
        }
        @keyframes integrations-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        /* FAQ Section */
        .faq-section {
          padding: 80px var(--landing-gutter);
          margin: 0;
          max-width: none;
          width: 100%;
          box-sizing: border-box;
        }
        .faq-section-inner {
          max-width: 48rem;
          margin-left: auto;
          margin-right: auto;
        }
        .faq-section .section-header {
          margin-bottom: 1.5rem;
        }
        .faq-section-title {
          font-size: 2.25rem;
          line-height: 1.15;
        }
        .faq-list {
          margin-top: 0;
        }
        .faq-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          border-left: 3px solid transparent;
          box-sizing: border-box;
          padding-left: 12px;
          transition:
            border-color 0.2s ease,
            border-left-color 0.2s ease;
        }
        .faq-item.open {
          border-left-color: color-mix(in srgb, var(--color-primary) 72%, transparent);
        }
        .faq-item:hover {
          border-bottom-color: rgba(37, 99, 235, 0.35);
        }
        .faq-question {
          width: 100%;
          padding: 24px 0;
          border: none;
          background: transparent;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 17px;
          font-weight: var(--landing-heading-weight);
          color: inherit;
          cursor: pointer;
          text-align: left;
        }
        .faq-question:focus-visible {
          outline: 2px solid rgba(37, 99, 235, 0.5);
          outline-offset: 4px;
          border-radius: 8px;
        }
        .faq-toggle {
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s ease;
        }
        .faq-item.open .faq-toggle {
          color: #2563EB;
          transform: rotate(180deg);
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
          padding: 80px var(--landing-gutter);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-bg {
          position: absolute;
          inset: 0;
          margin: 0 var(--landing-gutter);
          border-radius: 40px;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse 78% 62% at 50% 44%,
              color-mix(in srgb, var(--color-primary) 32%, transparent) 0%,
              color-mix(in srgb, var(--color-primary) 8%, transparent) 48%,
              transparent 72%
            ),
            radial-gradient(
              circle 42% at 50% 50%,
              color-mix(in srgb, var(--color-accent) 22%, transparent) 0%,
              transparent 65%
            ),
            rgba(37, 99, 235, 0.1);
        }
        .cta-content {
          position: relative;
          z-index: 1;
          max-width: 700px;
          margin: 0 auto;
        }
        .cta-title {
          font-size: clamp(2.25rem, 5.5vw, 3rem);
          font-weight: var(--landing-heading-weight);
          margin: 0 0 20px;
          line-height: 1.08;
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

        /* Footer — dark band (see --color-surface-ink in globals) */
        .landing-footer {
          position: relative;
          width: 100%;
          margin: 0;
          max-width: none;
          background: var(--color-surface-ink);
          color: rgba(255, 255, 255, 0.88);
          border-top: none;
        }
        .landing-footer::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 80px;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(
            to bottom,
            color-mix(in srgb, var(--color-primary) 14%, #f1f5f9) 0%,
            var(--color-surface-ink) 100%
          );
        }
        .landing-footer-inner {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 88px var(--landing-gutter) 40px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr);
          gap: 48px;
          margin-bottom: 48px;
        }
        .footer-brand p {
          font-size: 14px;
          color: #d1d5db;
          line-height: 1.7;
          margin-top: 16px;
          max-width: 300px;
        }
        .footer-social {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .social-link {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d1d5db;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }
        .social-link:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-inverse);
        }
        .footer-column h4 {
          font-size: 14px;
          font-weight: var(--landing-heading-weight);
          margin: 0 0 20px;
          color: #ffffff;
        }
        .footer-column a {
          display: block;
          font-size: 14px;
          color: #9ca3af;
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s ease;
        }
        .footer-column a:hover {
          color: #f3f4f6;
        }
        .footer-bottom {
          padding-top: 28px;
          margin-top: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-copyright {
          font-size: 14px;
          color: #9ca3af;
        }
        .footer-links {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .footer-links-sep {
          color: rgba(255, 255, 255, 0.35);
          user-select: none;
        }
        .footer-links a {
          font-size: 14px;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: #f3f4f6;
        }

        /* Pricing Section */
        .pricing-section {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 72px var(--landing-gutter);
          box-sizing: border-box;
        }
        .pricing-section.scp-landing-pricing {
          padding-bottom: 56px;
        }
        .pricing-section > * {
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }
        .scp-landing-pricing-head.section-header {
          max-width: 42rem;
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 20px;
        }
        .scp-landing-pricing-head .section-badge {
          margin-bottom: 10px;
        }
        .scp-landing-pricing-lead.section-subtitle {
          max-width: 38rem;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.65;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 40px;
        }
        .scp-pricing-layout {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-top: 16px;
        }
        .scp-pricing-layout > .scp-setup-fee-banner {
          margin-bottom: 8px;
        }
        .scp-landing-extras {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-top: 4px;
        }
        @media (min-width: 1024px) {
          .scp-landing-extras {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
        }
        .scp-landing-extra-card.scp-calling-banner {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .scp-landing-extra-card .scp-calling-banner-inner {
          flex: 1;
          align-items: center;
        }
        .scp-setup-fee-banner {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)) 0%,
            color-mix(in srgb, var(--color-surface-secondary) 92%, var(--color-primary) 8%) 100%
          );
          text-align: left;
          box-shadow: 0 1px 0 color-mix(in srgb, var(--color-primary) 10%, transparent),
            0 14px 36px color-mix(in srgb, var(--color-text) 4%, transparent);
        }
        .scp-setup-fee-banner-icon-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--color-primary) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
        }
        .scp-setup-fee-banner-icon {
          color: var(--color-primary);
        }
        .scp-setup-fee-banner-body {
          min-width: 0;
          flex: 1;
        }
        .scp-setup-fee-banner-label {
          display: block;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-primary);
        }
        .scp-setup-fee-banner-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: color-mix(in srgb, var(--color-text) 92%, transparent);
        }
        .scp-setup-fee-banner-strong {
          font-weight: 600;
          color: var(--color-text);
        }
        .pricing-price.scp-price-block {
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .pricing-period.scp-price-below {
          font-size: 13px;
          color: var(--color-text-muted);
          margin: 0;
        }
        .scp-features-toggle {
          margin-top: 10px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
          align-self: center;
        }
        .scp-features-toggle:hover {
          color: color-mix(in srgb, var(--color-primary) 85%, var(--color-text));
        }
        .scp-tier-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }
        .pricing-card.featured.scp-pro-tier {
          border: 2px solid var(--color-primary);
          background: linear-gradient(
            165deg,
            color-mix(in srgb, var(--color-primary) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-accent) 9%, transparent) 100%
          );
          transform: translateY(-8px) scale(1.02);
          box-shadow: var(--elev-shadow-lg);
        }
        .pricing-card.featured.scp-pro-tier:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: var(--elev-shadow-lg);
        }
        .scp-calling-banner {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
          background: var(--color-surface);
          box-shadow: 0 1px 0 color-mix(in srgb, var(--color-primary) 8%, transparent),
            0 16px 40px color-mix(in srgb, var(--color-text) 5%, transparent);
          text-align: left;
        }
        .scp-calling-banner-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px 20px;
          padding: 20px 22px 22px;
        }
        .scp-calling-banner-icon-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          color: var(--color-primary);
          background: linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-primary) 16%, transparent),
            color-mix(in srgb, var(--color-accent) 12%, transparent)
          );
          box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-surface) 35%, transparent);
        }
        .scp-calling-banner-text {
          flex: 1 1 200px;
          min-width: 0;
        }
        .scp-calling-banner-label {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--color-text);
        }
        .scp-calling-banner-desc {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: var(--color-text-muted);
        }
        .scp-calling-banner-price-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-start;
          padding: 10px 14px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--color-primary) 9%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
        }
        .scp-calling-banner-amount {
          font-size: 22px;
          font-weight: var(--landing-heading-weight);
          color: var(--color-primary);
          font-variant-numeric: tabular-nums;
        }
        .scp-calling-banner-sub {
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .scp-calling-banner-cta {
          flex-shrink: 0;
          width: auto;
          min-width: 148px;
          padding-left: 22px;
          padding-right: 22px;
        }
        .scp-tier-header {
          margin-bottom: 20px;
          padding-bottom: 20px;
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
          border-color: rgba(37, 99, 235, 0.3);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.15);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px;
          background: #2563EB;
          border-radius: 100px;
          font-size: 12px;
          font-weight: var(--landing-heading-weight);
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
          font-weight: var(--landing-heading-weight);
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
          font-weight: var(--landing-heading-weight);
          background: #2563EB;
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
          font-weight: var(--landing-heading-weight);
          background: #2563EB;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pricing-highlight {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
        }
        .pricing-highlight-text {
          font-size: 18px;
          font-weight: var(--landing-heading-weight);
          color: #2563EB;
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
          font-weight: var(--landing-heading-weight);
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
          background: rgba(37, 99, 235, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563EB;
        }
        .pricing-feature-text {
          line-height: 1.5;
        }
        .pricing-section-title {
          font-size: 13px;
          font-weight: var(--landing-heading-weight);
          color: #06B6D4;
          margin: 20px 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pricing-cta {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .pricing-cta-primary {
          background: #2563EB;
          border: none;
          color: #000;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
        }
        .pricing-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
        }
        .pricing-cta-secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .pricing-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(37, 99, 235, 0.4);
        }
        .pricing-note {
          margin-top: 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .scp-tier-grid {
            grid-template-columns: 1fr;
            max-width: 420px;
            margin-left: auto;
            margin-right: auto;
          }
          .pricing-card.featured.scp-pro-tier {
            transform: scale(1.02);
          }
          .pricing-card.featured.scp-pro-tier:hover {
            transform: translateY(-6px) scale(1.02);
          }
        }
        @media (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
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
          .integrations-inner {
            padding-top: 56px;
            padding-bottom: 32px;
          }
          .how-section {
            padding-top: 80px;
            padding-bottom: 80px;
          }
          .testimonials-inner {
            padding-top: 80px;
            padding-bottom: 80px;
          }
          .faq-section {
            padding: 80px var(--landing-gutter);
          }
          .cta-section {
            padding: 80px var(--landing-gutter);
          }
          .pricing-section {
            padding: 64px var(--landing-gutter);
          }
          .pricing-section.scp-landing-pricing {
            padding-bottom: 48px;
          }
        }
        @media (max-width: 768px) {
          .landing-header {
            padding: 14px var(--landing-gutter);
          }
          .trust-stats-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 14px 12px 10px;
            row-gap: 8px;
          }
          .trust-stat-cell:not(:first-child)::before {
            display: none;
          }
          .trust-stat-cell {
            padding: 10px 8px;
            border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
          }
          .trust-stat-cell:nth-child(n + 3) {
            border-bottom: none;
          }
          .trust-stat-value {
            font-size: clamp(26px, 7vw, 34px);
          }
          .trust-marquee-outer {
            mask-image: none;
            -webkit-mask-image: none;
          }
          .btn-hero-primary {
            width: 100%;
            justify-content: center;
          }
          .video-section {
            padding: 48px var(--landing-gutter) 56px;
          }
          .section-header {
            margin-bottom: 28px;
          }
          .section-subtitle {
            font-size: 15px;
            padding: 0 4px;
          }
          .scp-calling-banner-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .scp-calling-banner-cta {
            width: 100%;
            min-width: 0;
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
          .integrations-grid-desktop {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px 8px;
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

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          .integrations-marquee-track {
            animation: none !important;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            max-width: 100%;
            transform: none !important;
          }
          [data-reveal] {
            opacity: 1;
            transform: none;
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

      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden />

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
              <AppBrandLogoLockup theme={landingAppearance} height={APP_BRAND_LOGO_HEIGHT} style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }} />
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

      <LandingCompanyPreviewProvider variant="hero">
        <LandingHero
          onStartTrial={() => router.push("/auth/signup")}
          inputSlot={<LandingCompanyPreviewSearchInput />}
          belowInputSlot={<LandingCompanyPreviewBody />}
          footerSlot={
          <section className="landing-trust-band" aria-label="Stats and trusted by">
            <div className="trust-band-inner">
              <RevealOnView className="trust-band-card">
                <div className="trust-stats-row">
                  <div className="trust-stat-cell">
                    <div className="trust-stat-value">
                      <AnimatedCounter end={10} suffix="K+" />
                    </div>
                    <div className="trust-stat-label">Active Users</div>
                  </div>
                  <div className="trust-stat-cell">
                    <div className="trust-stat-value">
                      <AnimatedCounter end={50} suffix="M+" />
                    </div>
                    <div className="trust-stat-label">Emails Sent</div>
                  </div>
                  <div className="trust-stat-cell">
                    <div className="trust-stat-value">
                      <AnimatedCounter end={98} suffix="%" />
                    </div>
                    <div className="trust-stat-label">Deliverability</div>
                  </div>
                  <div className="trust-stat-cell">
                    <div className="trust-stat-value">
                      <AnimatedCounter end={4} suffix=".9" />
                    </div>
                    <div className="trust-stat-label">User Rating</div>
                  </div>
                </div>

                <div className="trust-logos-block">
                  <p className="trust-band-eyebrow">Trusted by innovative sales teams worldwide</p>
                  {TRUSTED_BY_BRANDS.length > 6 ? (
                    <div className="trust-marquee-outer">
                      <div className="trust-marquee-track">
                        {[...TRUSTED_BY_BRANDS, ...TRUSTED_BY_BRANDS].map((b, i) => (
                          <TrustedByLogoCell
                            key={`${b.slug}-${i}`}
                            name={b.name}
                            slug={b.slug}
                            color={b.color}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="trust-logos-static">
                      {TRUSTED_BY_BRANDS.map((b) => (
                        <TrustedByLogoCell key={b.slug} name={b.name} slug={b.slug} color={b.color} />
                      ))}
                    </div>
                  )}
                </div>
              </RevealOnView>
            </div>
          </section>
        }
      />
      </LandingCompanyPreviewProvider>

      <LandingFeaturesSection />

      {/* Integrations */}
      <section className="integrations-band landing-strip landing-strip--a" id="integrations" aria-labelledby="integrations-heading">
        <div className="integrations-inner box-border px-6 md:px-16 lg:px-24">
          <RevealOnView className="section-header">
            <div className="section-badge">
              <Icons.Plug size={14} />
              Integrations
            </div>
            <h2 id="integrations-heading" className="section-title">
              Works With Your Stack
            </h2>
            <p className="section-subtitle">Connect Outriva with your favorite tools</p>
          </RevealOnView>

          <div className="integrations-desktop hidden md:block">
            <div className="integrations-grid-desktop">
              {INTEGRATION_ITEMS.map(({ name, Icon }) => (
                <IntegrationCard key={name} name={name} icon={<Icon />} />
              ))}
            </div>
          </div>

          <div className="integrations-marquee md:hidden" role="region" aria-label="Integration logos">
            <div className="integrations-marquee-outer">
              <div className="integrations-marquee-track">
                {[...INTEGRATION_ITEMS, ...INTEGRATION_ITEMS].map(({ name, Icon }, i) => (
                  <IntegrationCard key={`${name}-${i}`} name={name} icon={<Icon />} reveal={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="video-section landing-strip landing-strip--b" id="demo">
        <RevealOnView className="section-header">
          <div className="section-badge">
            <Icons.Play size={14} />
            Product Demo
          </div>
          <h2 className="section-title">See Outriva in Action</h2>
          <p className="section-subtitle">
            Watch how our AI transforms your sales workflow in under 3 minutes
          </p>
        </RevealOnView>
        <RevealOnView
          className="video-section-embed"
          style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
        >
          <VideoPlaceholder title={`Product Demo: ${APP_BRAND_META_DESCRIPTION}`} duration="2:47" />
        </RevealOnView>
      </section>

      {/* How It Works */}
      <section className="how-section landing-strip landing-strip--a box-border px-6 md:px-12 lg:px-24" id="how-it-works">
        <div className="how-container">
          <RevealOnView className="section-header how-section-header">
            <div className="section-badge">
              <Icons.Zap size={14} />
              How It Works
            </div>
            <h2 className="section-title">Get Results in 3 Simple Steps</h2>
            <p className="section-subtitle">
              From goal to revenue in minutes, not weeks
            </p>
          </RevealOnView>

          <div className="steps-grid-wrap">
            <div className="steps-grid">
              <RevealOnView className="step-card" style={{ "--reveal-delay": "40ms" } as React.CSSProperties}>
                <span className="step-pill">Step 1</span>
                <div className="step-icon-wrap">
                  <div className="step-icon">
                    <Icons.Target size={30} strokeWidth={2} aria-hidden />
                  </div>
                </div>
                <h3 className="step-title">Define Your Goal</h3>
                <p className="step-desc">
                  Tell our AI what you want to achieve. It analyzes your goal and creates a complete outreach strategy tailored to your business.
                </p>
              </RevealOnView>

              <RevealOnView className="step-card step-card--mid" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                <span className="step-pill">Step 2</span>
                <div className="step-icon-wrap">
                  <div className="step-icon">
                    <Icons.Robot size={30} strokeWidth={2} aria-hidden />
                  </div>
                </div>
                <h3 className="step-title">AI Prepares Everything</h3>
                <p className="step-desc">
                  We generate leads, enrich data, segment audiences, and draft personalized messages — all automatically while you grab coffee.
                </p>
              </RevealOnView>

              <RevealOnView className="step-card" style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
                <span className="step-pill">Step 3</span>
                <div className="step-icon-wrap">
                  <div className="step-icon">
                    <Icons.Rocket size={30} strokeWidth={2} aria-hidden />
                  </div>
                </div>
                <h3 className="step-title">Launch &amp; Optimize</h3>
                <p className="step-desc">
                  Review, approve, and launch your campaign. Our AI continuously optimizes performance in real time for maximum results.
                </p>
              </RevealOnView>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials — hidden for now
      <section className="testimonials-band landing-strip landing-strip--b" id="testimonials">
        <div className="testimonials-inner box-border px-6 md:px-16 lg:px-24">
          <RevealOnView className="section-header">
            <div className="section-badge">
              <Icons.Star size={14} />
              Testimonials
            </div>
            <h2 className="section-title">Loved by Sales Teams</h2>
            <p className="section-subtitle">
              See what our customers have to say about Outriva
            </p>
          </RevealOnView>

          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} tintIndex={i} />
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Pricing */}
      <SalesCopilotPricingSection variant="landing" />

      {/* FAQ */}
      <section className="faq-section landing-strip landing-strip--a" id="faq">
        <div className="faq-section-inner">
          <RevealOnView className="section-header">
            <div className="section-badge">
              <Icons.Info size={14} />
              FAQ
            </div>
            <h2 className="section-title faq-section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">
              Everything you need to know about Outriva
            </p>
          </RevealOnView>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <FAQItem key={i} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section landing-strip landing-strip--b">
        <div className="cta-bg" />
        <RevealOnView className="cta-content">
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
          <p className="cta-note">No credit card required | 14-day free trial | Cancel anytime</p>
        </RevealOnView>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <RevealOnView className="footer-grid">
            <div className="footer-brand">
              <div className="logo-container">
                <AppBrandLogoLockup
                  theme={landingAppearance === "light" ? "light" : "dark"}
                  height={APP_BRAND_LOGO_HEIGHT}
                  style={{ maxWidth: APP_BRAND_LOGO_MAX_WIDTH }}
                />
              </div>
              <p>Your AI-powered workspace to scale outreach and close more deals.</p>
              <div className="footer-social">
                <Link href="/about" className="social-link" aria-label="Outriva on LinkedIn">
                  <Icons.Linkedin size={18} />
                </Link>
                <Link href="/contact" className="social-link" aria-label="Contact Outriva">
                  <Icons.MessageCircle size={18} />
                </Link>
                <Link href="/auth/signup" className="social-link" aria-label="Email Outriva">
                  <Icons.Mail size={18} />
                </Link>
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
              <Link href="/integration">Integrations</Link>
              <Link href="/upgrade">Upgrade</Link>
              <Link href="/contact">Contact</Link>
            </div>

            <div className="footer-column">
              <h4>Resources</h4>
              <Link href="/demo">Demo</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="#faq">FAQ</Link>
              <Link href="#testimonials">Customer Stories</Link>
            </div>
          </RevealOnView>

          <RevealOnView className="footer-bottom">
            <span className="footer-copyright">© 2026 Outriva. All rights reserved.</span>
            <div className="footer-links">
              <Link href="/privacy">Privacy Policy</Link>
              <span className="footer-links-sep" aria-hidden>
                ·
              </span>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </RevealOnView>
        </div>
      </footer>
    </div>
  );
}


