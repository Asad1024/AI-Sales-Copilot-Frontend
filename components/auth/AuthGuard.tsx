"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, getUser } from "@/lib/apiClient";
import { userNeedsOnboarding } from "@/lib/authRouting";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuthRoute = pathname?.startsWith("/auth");
    const isInviteRoute = pathname?.startsWith("/invite");
    const isOnboarding = pathname?.startsWith("/onboarding");
    const isLandingPage = pathname === "/";
    
    // Public routes don't need auth check
    if (isAuthRoute || isLandingPage || isInviteRoute) {
      setChecked(true);
      return;
    }

    // Not authenticated? Go to login (except for onboarding which handles its own redirect)
    if (!isAuthenticated() && !isOnboarding) {
      router.push("/auth/login");
      setChecked(false);
      return;
    }

    // Email verification before onboarding or any other app area (API enforces this too)
    const u = getUser();
    if (isAuthenticated() && u && u.email_verified === false) {
      router.replace("/auth/verify-required");
      setChecked(false);
      return;
    }

    // Platform admins only use /admin (never the end-user shell)
    if (isAuthenticated() && u?.role === "admin") {
      const onAdmin = pathname?.startsWith("/admin");
      if (!onAdmin) {
        router.replace("/admin");
        setChecked(false);
        return;
      }
      setChecked(true);
      return;
    }

    // Onboarding page handles its own logic
    if (isOnboarding) {
      setChecked(true);
      return;
    }

    // Server-owned onboarding flag (synced on login/refresh; works across devices)
    const needsOnboarding = userNeedsOnboarding(u);
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


