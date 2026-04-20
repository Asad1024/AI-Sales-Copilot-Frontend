"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy URL: new users are sent to /auth/signup?pending=… after Google OAuth.
 * This page only forwards so old bookmarks still work.
 */
function RedirectContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pending = params.get("pending");

  useEffect(() => {
    if (pending) {
      router.replace(`/auth/signup?pending=${encodeURIComponent(pending)}`);
    } else {
      router.replace("/auth/signup");
    }
  }, [pending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
      <span className="sr-only">Redirecting…</span>
    </div>
  );
}

export default function GoogleCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
