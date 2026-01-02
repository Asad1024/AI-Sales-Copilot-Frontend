"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";

export default function LeadsPage() {
  const router = useRouter();
  const { activeBaseId, bases, refreshBases } = useBaseStore();
  useEffect(() => {
    const redirectToBaseLeads = async () => {
      // Ensure bases are loaded
      if (bases.length === 0) {
        await refreshBases();
      }
      
      if (activeBaseId) {
        router.replace(`/bases/${activeBaseId}/leads`);
      } else if (bases.length > 0) {
        // Redirect to first base if no active base
        router.replace(`/bases/${bases[0].id}/leads`);
      } else {
        // No bases exist, redirect to bases page
        router.replace('/bases');
      }
    };

    redirectToBaseLeads();
  }, [activeBaseId, bases, router, refreshBases]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="text-hint">Redirecting...</div>
    </div>
  );
}
