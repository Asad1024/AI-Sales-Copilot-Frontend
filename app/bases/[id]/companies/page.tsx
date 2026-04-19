"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useBaseStore } from "@/stores/useBaseStore";
import { Icons } from "@/components/ui/Icons";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import {
  LandingCompanyPreviewBody,
  LandingCompanyPreviewHeroPills,
  LandingCompanyPreviewProvider,
  LandingCompanyPreviewSearchInput,
} from "@/components/landing/LandingCompanyPreviewShell";

export default function BaseCompaniesPage() {
  const router = useRouter();
  const params = useParams();
  const baseId = params?.id ? parseInt(params.id as string, 10) : null;
  const { bases, setActiveBaseId, refreshBases } = useBaseStore();
  const { activeBaseId } = useBaseStore();
  const { loading: permissionsLoading } = useBasePermissions(baseId || activeBaseId);

  const [pageReady, setPageReady] = useState(false);

  const currentBaseId = baseId || activeBaseId;
  const workspaceName = bases.find((b) => b.id === currentBaseId)?.name ?? "";

  useEffect(() => {
    const sync = async () => {
      if (!baseId) {
        if (activeBaseId) router.replace(`/bases/${activeBaseId}/companies`);
        else if (bases.length > 0) router.replace(`/bases/${bases[0].id}/companies`);
        else router.replace("/bases");
        return;
      }
      if (bases.length === 0) await refreshBases();
      setActiveBaseId(baseId);
      setPageReady(true);
    };
    void sync();
  }, [baseId, activeBaseId, bases.length, refreshBases, router, setActiveBaseId]);

  if (!baseId || !currentBaseId || !pageReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "var(--color-canvas)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--color-text-muted)" }}>
          <Icons.Loader size={20} strokeWidth={1.5} style={{ animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading…</span>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        width: "100%",
        background: "var(--color-canvas)",
        padding: "clamp(16px, 3vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {permissionsLoading ? (
        <GlobalPageLoader layout="embedded" fill minHeight={400} ariaLabel="Loading" />
      ) : (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-primary)",
              }}
              aria-hidden
            >
              <Building2 size={22} strokeWidth={1.75} />
            </span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text)",
                }}
              >
                Companies
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                {workspaceName ? (
                  <>
                    Same live preview as the marketing homepage — suggestions, firmographics, and team preview use the
                    public landing APIs (daily limits apply).
                  </>
                ) : (
                  <>Same live preview as the homepage — public landing APIs and limits.</>
                )}
              </p>
            </div>
          </div>

          <LandingCompanyPreviewProvider variant="app">
            <div className="relative min-w-0 w-full">
              <div className="landing-hero-preview-shell relative max-w-full overflow-x-clip overflow-hidden rounded-[1.5rem] border border-[color:color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color:var(--color-surface)] p-7 shadow-[0_12px_40px_rgba(15,23,42,0.07),0_1px_0_rgba(255,255,255,0.65)_inset] sm:rounded-[1.65rem] sm:p-10">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">
                    Try it live
                  </span>
                  <span className="landing-live-preview-badge inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-gradient-to-r from-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] to-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-primary)] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                      <span className="landing-live-preview-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-primary)] opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_8px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]" />
                    </span>
                    Live preview
                  </span>
                </div>

                <h2 className="mt-3 max-w-full text-[clamp(12px,3.1vw,15px)] font-semibold leading-snug tracking-tight text-balance text-[color:var(--color-text)]">
                  Search any company — see enriched intel before you sign up
                </h2>

                <div className="mt-6 min-w-0">
                  <LandingCompanyPreviewSearchInput className="landing-hero-search flex w-full min-w-0 items-center overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]" />
                </div>

                <LandingCompanyPreviewHeroPills />

                <div className="mt-6 min-w-0">
                  <LandingCompanyPreviewBody />
                </div>
              </div>
            </div>
          </LandingCompanyPreviewProvider>
        </div>
      )}
    </div>
  );
}
