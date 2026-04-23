"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Building2 } from "lucide-react";
import { useBaseStore } from "@/stores/useBaseStore";
import { Icons } from "@/components/ui/Icons";
import { UiSkeleton } from "@/components/ui/AppSkeleton";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import {
  LandingCompanyPreviewBody,
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
        <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }} aria-busy="true" aria-label="Loading">
          <UiSkeleton height={200} width="100%" radius={14} />
          <UiSkeleton height={48} width="100%" style={{ maxWidth: 480 }} radius={10} />
          <UiSkeleton height={360} width="100%" radius={14} />
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto" }}>
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
                Search companies and preview available team contacts.
              </p>
            </div>
          </div>

          <LandingCompanyPreviewProvider variant="app" employeeLimit={30} baseId={baseId}>
            <div className="relative min-w-0 w-full">
              <div className="landing-hero-preview-shell relative -mx-2 w-[calc(100%+16px)] max-w-none overflow-x-clip overflow-hidden rounded-[1.5rem] border border-[color:color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color:var(--color-surface)] p-7 shadow-[0_12px_40px_rgba(15,23,42,0.07),0_1px_0_rgba(255,255,255,0.65)_inset] sm:-mx-4 sm:w-[calc(100%+32px)] sm:rounded-[1.65rem] sm:p-10">
                <div className="mt-2 min-w-0">
                  <LandingCompanyPreviewSearchInput className="landing-hero-search flex w-full min-w-0 items-center overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]" />
                </div>

                <div
                  className="mt-3 -mx-2 w-[calc(100%+16px)] rounded-xl border border-[color:color-mix(in_srgb,var(--color-primary)_45%,var(--color-border)_55%)] bg-[color:color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface)_86%)] px-5 py-3 text-[13px] leading-5 text-[color:var(--color-text)] sm:-mx-3 sm:w-[calc(100%+24px)]"
                  role="note"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[color:var(--color-primary)]" />
                    <div>
                      <div className="font-semibold">Temporary preview data</div>
                      <div className="mt-0.5 text-[color:var(--color-text-muted)]">
                        This data is not saved. Download the employee list if you need to keep it. Refreshing the page clears the current preview.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 min-w-0">
                  <LandingCompanyPreviewBody showSignupCtas={false} showEmployeeLinkedIn={true} />
                </div>
              </div>
            </div>
          </LandingCompanyPreviewProvider>
        </div>
      )}
    </div>
  );
}

