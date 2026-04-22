"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { APP_BRAND_LOGO_HEIGHT, APP_BRAND_LOGO_MAX_WIDTH, AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";
import LandingThemeToggle from "@/components/ui/LandingThemeToggle";
import { useBaseStore } from "@/stores/useBaseStore";
import "@/styles/landing-theme-light.css";
import "@/styles/landing-marketing-header-dark.css";
import "@/styles/landing-nav-cta.css";

export type LandingMarketingNavCta = "signup" | "dashboard";

export type LandingMarketingNavLinks = "marketing" | "app";

function appNavLinkActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/campaigns") return pathname === "/campaigns" || pathname.startsWith("/campaigns/");
  if (href.includes("/companies")) return pathname.includes("/companies");
  if (href.includes("/leads"))
    return pathname === "/leads" || pathname.startsWith("/leads/") || (pathname.includes("/bases/") && pathname.includes("/leads"));
  /** Workspaces list or a single base home — not …/leads, …/companies, etc. */
  if (href === "/bases") {
    if (!pathname.startsWith("/bases")) return false;
    if (pathname === "/bases") return true;
    const rest = pathname.slice("/bases".length);
    const segments = rest.replace(/^\//, "").split("/").filter(Boolean);
    return segments.length === 1;
  }
  return false;
}

function companiesNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href.includes("/companies")) return pathname.includes("/companies");
  return false;
}

type LandingMarketingNavProps = {
  cta: LandingMarketingNavCta;
  appearance: "light" | "dark";
  onToggleAppearance: () => void;
  /** `marketing` = home anchors; `app` = in-app routes (Workspace, Leads, Campaigns, Companies) */
  links?: LandingMarketingNavLinks;
  /** When false, hides Log in (e.g. upgrade page for signed-in users). Default true. */
  showLogin?: boolean;
};

export default function LandingMarketingNav({
  cta,
  appearance,
  onToggleAppearance,
  links = "marketing",
  showLogin = true,
}: LandingMarketingNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeBaseId = useBaseStore((s) => s.activeBaseId);
  const [scrollY, setScrollY] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLogoHeight = Math.max(20, APP_BRAND_LOGO_HEIGHT - 2);
  const navLogoMaxWidth = APP_BRAND_LOGO_MAX_WIDTH + 2;

  const { leadsHref, companiesHref } = useMemo(() => {
    const id = activeBaseId != null ? String(activeBaseId) : "";
    return {
      leadsHref: id ? `/bases/${id}/leads` : "/leads",
      companiesHref: id ? `/bases/${id}/companies` : "/bases",
    };
  }, [activeBaseId]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const primaryCta = useCallback(() => {
    if (cta === "dashboard") router.push("/dashboard");
    else router.push("/auth/signup");
  }, [cta, router]);

  const desktopNav =
    links === "app" ? (
      <>
        <Link
          href="/bases"
          className={`nav-link${appNavLinkActive(pathname, "/bases") ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, "/bases") ? "page" : undefined}
        >
          Workspace
        </Link>
        <Link
          href={leadsHref}
          className={`nav-link${appNavLinkActive(pathname, leadsHref) ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, leadsHref) ? "page" : undefined}
        >
          Leads
        </Link>
        <Link
          href="/campaigns"
          className={`nav-link${appNavLinkActive(pathname, "/campaigns") ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, "/campaigns") ? "page" : undefined}
        >
          Campaigns
        </Link>
        <Link
          href={companiesHref}
          className={`nav-link${companiesNavActive(pathname, companiesHref) ? " nav-link--active" : ""}`}
          aria-current={companiesNavActive(pathname, companiesHref) ? "page" : undefined}
        >
          Companies
        </Link>
      </>
    ) : (
      <>
        <Link href="/#features" className="nav-link">
          Features
        </Link>
        <Link href="/#how-it-works" className="nav-link">
          How It Works
        </Link>
        <Link href="/#testimonials" className="nav-link">
          Testimonials
        </Link>
        <Link href="/#pricing" className="nav-link">
          Pricing
        </Link>
      </>
    );

  const mobileNav =
    links === "app" ? (
      <>
        <Link
          href="/bases"
          className={`nav-link${appNavLinkActive(pathname, "/bases") ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, "/bases") ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
        >
          Workspace
        </Link>
        <Link
          href={leadsHref}
          className={`nav-link${appNavLinkActive(pathname, leadsHref) ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, leadsHref) ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
        >
          Leads
        </Link>
        <Link
          href="/campaigns"
          className={`nav-link${appNavLinkActive(pathname, "/campaigns") ? " nav-link--active" : ""}`}
          aria-current={appNavLinkActive(pathname, "/campaigns") ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
        >
          Campaigns
        </Link>
        <Link
          href={companiesHref}
          className={`nav-link${companiesNavActive(pathname, companiesHref) ? " nav-link--active" : ""}`}
          aria-current={companiesNavActive(pathname, companiesHref) ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
        >
          Companies
        </Link>
      </>
    ) : (
      <>
        <Link href="/#features" className="nav-link" onClick={() => setMobileNavOpen(false)}>
          Features
        </Link>
        <Link href="/#how-it-works" className="nav-link" onClick={() => setMobileNavOpen(false)}>
          How It Works
        </Link>
        <Link href="/#testimonials" className="nav-link" onClick={() => setMobileNavOpen(false)}>
          Testimonials
        </Link>
        <Link href="/#pricing" className="nav-link" onClick={() => setMobileNavOpen(false)}>
          Pricing
        </Link>
      </>
    );

  return (
    <>
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
            <Link href="/" className="logo-container" style={{ textDecoration: "none", color: "inherit" }}>
              <AppBrandLogoLockup theme={appearance} height={navLogoHeight} style={{ maxWidth: navLogoMaxWidth }} />
            </Link>
          </div>
          <nav className="nav-links landing-nav-desktop" aria-label="Primary">
            {desktopNav}
          </nav>
          <div className="landing-header-actions">
            <LandingThemeToggle appearance={appearance} onToggle={onToggleAppearance} />
            <div className="nav-buttons">
              {showLogin ? (
                <button type="button" className="btn-login" onClick={() => router.push("/auth/login")}>
                  Log in
                </button>
              ) : null}
              <button type="button" className="btn-cta" onClick={primaryCta}>
                {cta === "dashboard" ? "Go to Dashboard" : "Get Started"}
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
            {mobileNav}
            {showLogin ? (
              <Link href="/auth/login" className="nav-link" onClick={() => setMobileNavOpen(false)}>
                Log in
              </Link>
            ) : null}
            <button type="button" className="btn-cta" onClick={() => { setMobileNavOpen(false); primaryCta(); }}>
              {cta === "dashboard" ? "Go to Dashboard" : "Get Started"}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
