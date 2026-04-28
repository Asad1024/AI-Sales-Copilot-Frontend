import { Suspense } from "react";
import { IntegrationsHub } from "@/app/settings/IntegrationsHub";

export default function IntegrationPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsHub />
    </Suspense>
  );
}

