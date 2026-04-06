"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL: sends users to Settings → Test configuration tab. */
export default function TestConfigurationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=test-configuration");
  }, [router]);
  return null;
}
