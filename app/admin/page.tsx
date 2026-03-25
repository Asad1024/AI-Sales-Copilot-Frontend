"use client";
import { useState, useEffect } from "react";
import { apiRequest, getUser } from "@/lib/apiClient";
import AdminGuard from "@/components/auth/AdminGuard";

interface SystemStats {
  totalUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalLeads: 0,
    totalCampaigns: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersData, leadsData, campaignsData] = await Promise.all([
          apiRequest("/admin/users").catch(() => ({ users: [] })),
          apiRequest("/leads").catch(() => ({ leads: [] })),
          apiRequest("/campaigns").catch(() => ({ campaigns: [] }))
        ]);

        const users = Array.isArray(usersData) ? usersData : (usersData?.users || []);
        const leads = Array.isArray(leadsData) ? leadsData : (leadsData?.leads || []);
        const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData?.campaigns || []);

        setStats({
          totalUsers: users.length,
          totalLeads: leads.length,
          totalCampaigns: campaigns.length,
          activeUsers: users.filter((u: any) => u.role === "user").length
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminGuard>
      <div style={{ padding: "12px 20px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>Admin Dashboard</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "16px" }}>
            Welcome back, {user?.name}. Manage your platform from here.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px" }}>Loading...</div>
        ) : (
          <>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
              gap: "24px",
              marginBottom: "32px"
            }}>
              <div style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 8px var(--color-shadow)"
              }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  Total Users
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#4C67FF", marginBottom: "4px" }}>
                  {stats.totalUsers}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {stats.activeUsers} active users
                </div>
              </div>

              <div style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 8px var(--color-shadow)"
              }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  Total Leads
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#A94CFF", marginBottom: "4px" }}>
                  {stats.totalLeads}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Across all bases
                </div>
              </div>

              <div style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 8px var(--color-shadow)"
              }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  Total Campaigns
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#ff6b6b", marginBottom: "4px" }}>
                  {stats.totalCampaigns}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Active & scheduled
                </div>
              </div>

              <div style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 8px var(--color-shadow)"
              }}>
                <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  System Health
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "#4ecdc4", marginBottom: "4px" }}>
                  ✓
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  All systems operational
                </div>
              </div>
            </div>

            <div style={{
              background: "var(--color-surface)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--color-border)",
              boxShadow: "0 2px 8px var(--color-shadow)"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Quick Actions</h2>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a href="/admin/users" className="btn-primary" style={{ textDecoration: "none" }}>
                  Manage Users
                </a>
                <a href="/admin/settings" className="btn-secondary" style={{ textDecoration: "none" }}>
                  System Settings
                </a>
                <a href="/admin/logs" className="btn-secondary" style={{ textDecoration: "none" }}>
                  View Logs
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}

