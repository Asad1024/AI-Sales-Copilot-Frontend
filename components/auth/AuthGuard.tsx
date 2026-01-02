"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/apiClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuthRoute = pathname?.startsWith("/auth");
    const isOnboarding = pathname?.startsWith("/onboarding");
    const isLandingPage = pathname === "/";
    
    // Public routes don't need auth check
    if (isAuthRoute || isLandingPage) {
      setChecked(true);
      return;
    }

    // Not authenticated? Go to login (except for onboarding which handles its own redirect)
    if (!isAuthenticated() && !isOnboarding) {
      router.push("/auth/login");
      setChecked(false);
      return;
    }

    // Onboarding page handles its own logic
    if (isOnboarding) {
      setChecked(true);
      return;
    }

    // For authenticated users on protected routes:
    // Only redirect to onboarding if explicitly flagged as needing it (new signup)
    // This flag is ONLY set to "false" during new signup, never during login
    const needsOnboarding = localStorage.getItem("sparkai:profile_complete") === "false";
    if (needsOnboarding) {
      router.push("/onboarding");
      setChecked(false);
      return;
    }
    
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div className="text-hint">Checking authentication…</div>
      </div>
    );
  }
  return <>{children}</>;
}


