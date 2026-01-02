"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/apiClient";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = getUser();
    
    if (!user) {
      router.push("/auth/login");
      setChecked(false);
      return;
    }

    if (user.role !== "admin") {
      router.push("/dashboard");
      setChecked(false);
      return;
    }
    
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div className="text-hint">Checking admin access…</div>
      </div>
    );
  }
  return <>{children}</>;
}

