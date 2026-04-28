"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { apiRequest, getUser, setUser, type User } from "@/lib/apiClient";

/** After grace ends (credits cleared / enforcement), show post-grace copy only this long, then hide automatically. */
const POST_GRACE_BANNER_VISIBLE_MS = 2 * 60 * 1000;

function parseIsoMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function computeBillingBannerState(u: User | null, nowMs: number) {
  const expiresMs = parseIsoMs(u?.billing_expires_at);
  const graceMs = parseIsoMs(u?.billing_grace_ends_at);
  if (!expiresMs || !graceMs) return { shouldShow: false as const };

  if (nowMs < expiresMs) return { shouldShow: false as const };
  const inGrace = nowMs < graceMs;
  if (!inGrace && nowMs >= graceMs + POST_GRACE_BANNER_VISIBLE_MS) {
    return { shouldShow: false as const };
  }
  const minsLeft = Math.max(0, Math.ceil((graceMs - nowMs) / 60000));
  return {
    shouldShow: true as const,
    inGrace,
    minsLeft,
  };
}

export function BillingExpiryBanner({ leftOffsetPx = 0 }: { leftOffsetPx?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  /** Full-bleed hub pages: no top billing strip (same clean chrome as Upgrade). */
  const hideOnFullBleedHub = pathname?.startsWith("/upgrade") || pathname?.startsWith("/help");
  /** Contact / help: match `.upgrade-fullpage__main` horizontal rhythm when no sidebar. */
  const alignWithLandingMain =
    leftOffsetPx === 0 && (pathname?.startsWith("/contact") || pathname?.startsWith("/help"));

  const [u, setU] = useState<User | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("sparkai:billing-banner:dismissed") === "1";
  });

  useEffect(() => {
    const sync = () => setU(getUser());
    sync();
    window.addEventListener("sparkai:user-changed", sync);
    return () => window.removeEventListener("sparkai:user-changed", sync);
  }, []);

  // Keep time moving for countdown wording.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Poll /auth/me so banner updates automatically when cron enforcement flips state.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const me = (await apiRequest("/auth/me")) as { user: User };
        if (cancelled) return;
        if (me?.user) setUser(me.user);
      } catch {
        /* ignore */
      }
    };
    // quick start, then every 30s
    void poll();
    const id = window.setInterval(poll, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const state = useMemo(() => computeBillingBannerState(u, nowMs), [u, nowMs]);
  if (!state.shouldShow) return null;

  if (hideOnFullBleedHub) return null;

  if (dismissed) return null;

  const message = state.inGrace
    ? `Your payment is expired. Renew within ${state.minsLeft} minute(s) to keep your credits and team access.`
    : "Grace period ended. Your credits were removed and your team access was disabled. Buy again to restore access.";
  const ctaLabel = state.inGrace ? "Renew" : "Buy again";
  const title = state.inGrace ? "Subscription expired — grace started" : "Subscription expired";

  return (
    <div
      className="bg-red-600 border-b border-red-700"
      style={{ position: "sticky", top: 0, zIndex: 40, paddingLeft: leftOffsetPx }}
    >
      <div
        className={[
          "py-3 sm:py-3.5",
          alignWithLandingMain
            ? "mx-auto w-full max-w-[1260px] px-[clamp(18px,4vw,32px)]"
            : "pl-3 pr-3 sm:pr-4",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left content */}
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="shrink-0 mt-0.5">
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" aria-hidden />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] sm:text-sm font-semibold text-white leading-5 tracking-tight">
                {title}
              </p>
              <p className="text-[12px] sm:text-xs text-white/90 mt-1 leading-[1.35rem] break-words">
                {message}
              </p>
            </div>
          </div>

          {/* Right actions (never shrink) */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/upgrade")}
              className="shrink-0 inline-flex h-9 items-center justify-center rounded-lg border border-white/25 bg-white px-4 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-600"
            >
              {ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("sparkai:billing-banner:dismissed", "1");
                }
              }}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-red-600"
              aria-label="Dismiss"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

