"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CreditCard, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import LandingMarketingNav from "@/components/landing/LandingMarketingNav";
import { isAuthenticated } from "@/lib/apiClient";
import "../upgrade/upgrade-page.css";
import "./help-page.css";

const CONTACT_EMAIL = "contactus@sparkai.ae";
const OFFICE_ADDRESS = "Office 705, New Century City Tower, Port Saeed, Dubai, UAE";
/** UAE landline (display) and E.164 for tel: */
const PHONE_LANDLINE_DISPLAY = "04 339 2208";
const PHONE_LANDLINE_TEL = "+97143392208";
const PHONE_MOBILE_A_DISPLAY = "+971 56 956 8061";
const PHONE_MOBILE_A_TEL = "+971569568061";
const PHONE_MOBILE_B_DISPLAY = "+971 56 956 7693";
const PHONE_MOBILE_B_TEL = "+971569567693";

export default function HelpPage() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const authed = isAuthenticated();

  const toggleAppearance = useCallback(() => {
    setAppearance((v) => (v === "light" ? "dark" : "light"));
  }, []);

  return (
    <div className={!authed ? `upgrade-fullpage landing-page${appearance === "light" ? " landing-theme-light" : ""}` : undefined}>
      {!authed ? (
        <LandingMarketingNav
          cta="dashboard"
          appearance={appearance}
          onToggleAppearance={toggleAppearance}
          links="marketing"
          showLogin
        />
      ) : null}
      <main className={!authed ? "upgrade-fullpage__main" : undefined} style={authed ? { maxWidth: 1100, margin: "0 auto" } : undefined}>
        <header className="upgrade-fullpage__hero">
          <p className="upgrade-fullpage__kicker">Support</p>
          <h1 className="upgrade-fullpage__title">How can we help?</h1>
          <p className="upgrade-fullpage__lead">
            Reach our team, fix billing questions, or pick up a few shortcuts—everything in one place.
          </p>
        </header>

        <div className="helpHub helpHub--embedded">
          <div className="helpHub__bento">
            <a href={`mailto:${CONTACT_EMAIL}`} className="helpHub__tile helpHub__tile--featured">
              <span className="helpHub__iconWrap" aria-hidden>
                <Mail size={22} strokeWidth={2} />
              </span>
              <h2 className="helpHub__tileTitle">Email us directly</h2>
              <p className="helpHub__tileDesc">
                Fastest for bugs, access issues, or billing disputes. Include your workspace name and a short summary.
              </p>
              <span className="helpHub__email">{CONTACT_EMAIL}</span>
              <span className="helpHub__tileCta" style={{ marginTop: "1.1rem" }}>
                Open mail app
                <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
              </span>
            </a>

            <Link href="/contact" className="helpHub__tile helpHub__tile--accentBlue">
              <span className="helpHub__iconWrap" aria-hidden>
                <MessageCircle size={22} strokeWidth={2} />
              </span>
              <h2 className="helpHub__tileTitle">Sales &amp; partnerships</h2>
              <p className="helpHub__tileDesc">Demos, enterprise plans, or anything that needs a conversation first.</p>
              <span className="helpHub__tileCta">
                Contact page
                <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
              </span>
            </Link>

            <Link href="/settings?tab=payments" className="helpHub__tile helpHub__tile--accentViolet">
              <span className="helpHub__iconWrap" aria-hidden>
                <CreditCard size={22} strokeWidth={2} />
              </span>
              <h2 className="helpHub__tileTitle">Plan &amp; billing</h2>
              <p className="helpHub__tileDesc">Upgrade, payment method, invoices, and credit history in Settings.</p>
              <span className="helpHub__tileCta">
                Open payments
                <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
              </span>
            </Link>
          </div>

          <section className="helpHub__contactCard" aria-labelledby="help-contact-us-heading">
            <h2 id="help-contact-us-heading" className="helpHub__contactCardTitle">
              Contact Us
            </h2>
            <ul className="helpHub__contactList">
              <li className="helpHub__contactRow">
                <MapPin size={22} strokeWidth={2} aria-hidden />
                <span className="helpHub__contactText">{OFFICE_ADDRESS}</span>
              </li>
              <li className="helpHub__contactRow">
                <Phone size={22} strokeWidth={2} aria-hidden />
                <span className="helpHub__contactText">
                  <a className="helpHub__contactLink" href={`tel:${PHONE_LANDLINE_TEL}`}>
                    {PHONE_LANDLINE_DISPLAY}
                  </a>
                  <span style={{ opacity: 0.75 }}> / </span>
                  <a className="helpHub__contactLink" href={`tel:${PHONE_MOBILE_B_TEL}`}>
                    {PHONE_MOBILE_B_DISPLAY}
                  </a>
                  <span style={{ opacity: 0.75 }}> · </span>
                  <a className="helpHub__contactLink" href={`tel:${PHONE_MOBILE_A_TEL}`}>
                    {PHONE_MOBILE_A_DISPLAY}
                  </a>
                </span>
              </li>
              <li className="helpHub__contactRow">
                <Mail size={22} strokeWidth={2} aria-hidden />
                <span className="helpHub__contactText">
                  <a className="helpHub__contactLink" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </span>
              </li>
            </ul>
          </section>

          <section className="helpHub__tips" aria-labelledby="help-tips-heading">
            <div className="helpHub__tipsHead">
              <span className="helpHub__iconWrap" style={{ width: 40, height: 40, marginBottom: 0 }} aria-hidden>
                <BookOpen size={18} strokeWidth={2} />
              </span>
              <h2 id="help-tips-heading">Get productive faster</h2>
            </div>
            <div className="helpHub__tipsGrid">
              <div className="helpHub__tip">
                <div className="helpHub__tipNum">1</div>
                Use <strong>Workspaces</strong> to keep teams, brands, or regions cleanly separated.
              </div>
              <div className="helpHub__tip">
                <div className="helpHub__tipNum">2</div>
                Wire <strong>Integrations</strong> before launch so sends and replies land where you expect.
              </div>
              <div className="helpHub__tip">
                <div className="helpHub__tipNum">3</div>
                Watch <strong>Notifications</strong> for invites, role changes, and system alerts.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
