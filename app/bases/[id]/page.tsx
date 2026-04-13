"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";

export default function BaseOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const baseId = params?.id ? parseInt(params.id as string) : null;
  const { bases, setActiveBaseId, refreshBases } = useBaseStore();

  useEffect(() => {
    const syncBaseAndRedirect = async () => {
      if (!baseId) {
        router.replace('/bases');
        return;
      }

      // Ensure bases are loaded
      if (bases.length === 0) {
        await refreshBases();
      }

      const baseExists = bases.find(b => b.id === baseId);
      if (!baseExists && bases.length > 0) {
        // Base doesn't exist - redirect to bases list
        router.replace('/bases');
        return;
      }

      // Update store if base ID changed
      if (baseId && baseId !== useBaseStore.getState().activeBaseId) {
        const b = useBaseStore.getState().bases.find((x) => x.id === baseId);
        setActiveBaseId(baseId, b ? { name: b.name } : undefined);
      }

      // Redirect to leads page by default
      router.replace(`/bases/${baseId}/leads`);
    };

    syncBaseAndRedirect();
  }, [baseId, bases, setActiveBaseId, router, refreshBases]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="text-hint">Loading...</div>
    </div>
  );
}

