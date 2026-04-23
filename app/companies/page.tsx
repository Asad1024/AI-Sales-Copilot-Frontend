"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";

export default function CompaniesPage() {
  const router = useRouter();
  const { activeBaseId, bases, refreshBases } = useBaseStore();
  useEffect(() => {
    if (!activeBaseId && bases.length === 0) {
      refreshBases();
      return;
    }
    if (activeBaseId) {
      router.replace(`/bases/${activeBaseId}/companies`);
    }
  }, [activeBaseId, bases.length, router, refreshBases]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!activeBaseId ? (
        <EmptyStateBanner
          icon={<Icons.Folder size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No Active Workspace"
          description="Please create a workspace to launch and manage campaigns."
          actions={
            <button className="btn-primary" style={{ borderRadius: 8 }} onClick={() => router.push("/bases")}>
              Create a workspace
            </button>
          }
        />
      ) : (
        <div className="text-hint">Redirecting to companies…</div>
      )}
    </div>
  );
}
