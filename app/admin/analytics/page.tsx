"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import type { AdminAnalyticsPayload } from "@/lib/adminAnalyticsTypes";
import AdminPageToolbar from "@/components/admin/AdminPageToolbar";
import { AdminAnalyticsDashboard } from "@/components/admin/AdminPlatformAnalyticsCharts";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const json = (await apiRequest(`/admin/analytics?days=${d}`)) as AdminAnalyticsPayload;
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageToolbar
        searchValue=""
        onSearchChange={() => {}}
        showSearch={false}
        filters={
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Platform analytics</span>
        }
        right={
          <>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin")}>
              Overview
            </button>
          </>
        }
      />

      <AdminAnalyticsDashboard data={data} loading={loading} days={days} onDaysChange={setDays} />
    </div>
  );
}
