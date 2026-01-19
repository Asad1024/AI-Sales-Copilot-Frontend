"use client";
import { useState } from "react";
import { apiRequest, getUser, clearAuth } from "@/lib/apiClient";

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

export default function SafetySection() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const user = getUser();

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      alert("Please type DELETE to confirm account deletion");
      return;
    }

    const finalConfirm = confirm(
      "⚠️ FINAL WARNING ⚠️\n\n" +
      "This action is PERMANENT and CANNOT be undone!\n\n" +
      "All your data will be deleted:\n" +
      "• Your account\n" +
      "• Your workspaces (or transferred to other admins)\n" +
      "• Your leads and campaigns\n" +
      "• All your settings\n\n" +
      "Are you absolutely sure?"
    );

    if (!finalConfirm) return;

    setDeleting(true);
    try {
      await apiRequest("/auth/account", { method: "DELETE" });
      
      // Clear local data
      clearAuth();
      
      // Show success message
      alert("Your account has been deleted successfully. You will be redirected to the home page.");
      
      // Redirect to home
      window.location.href = "/";
    } catch (error: any) {
      alert(error?.message || "Failed to delete account. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Security Settings */}
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldIcon />
          Security & Privacy
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Email Verification Status */}
          <div style={{
            padding: "16px",
            borderRadius: "12px",
            background: user?.email_verified 
              ? "rgba(76, 175, 80, 0.1)" 
              : "rgba(255, 152, 0, 0.1)",
            border: `1px solid ${user?.email_verified ? "rgba(76, 175, 80, 0.3)" : "rgba(255, 152, 0, 0.3)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  Email Verification
                </div>
                <div style={{ fontSize: "14px", color: "#888" }}>
                  {user?.email_verified 
                    ? "✅ Your email is verified" 
                    : "⚠️ Please verify your email address"}
                </div>
              </div>
              {!user?.email_verified && (
                <button
                  onClick={async () => {
                    try {
                      await apiRequest("/email-verification/resend", { method: "POST" });
                      alert("Verification email sent! Check your inbox.");
                    } catch (error: any) {
                      alert(error?.message || "Failed to send verification email");
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#FF9800",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Resend Email
                </button>
              )}
            </div>
          </div>

          {/* Password Change */}
          <div style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(76, 103, 255, 0.1)",
            border: "1px solid rgba(76, 103, 255, 0.3)",
          }}>
            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
              Password
            </div>
            <div style={{ fontSize: "14px", color: "#888", marginBottom: "12px" }}>
              Change your password to keep your account secure
            </div>
            <button
              onClick={() => {
                // TODO: Implement password change modal
                alert("Password change feature coming soon! For now, use the password reset link on the login page.");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{
        borderTop: "2px solid rgba(244, 67, 54, 0.2)",
        paddingTop: "32px",
      }}>
        <h2 style={{ 
          fontSize: "20px", 
          fontWeight: "600", 
          marginBottom: "8px",
          color: "#f44336",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ⚠️ Danger Zone
        </h2>
        <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>
          Irreversible and destructive actions
        </p>

        <div style={{
          padding: "24px",
          borderRadius: "12px",
          background: "rgba(244, 67, 54, 0.05)",
          border: "2px solid rgba(244, 67, 54, 0.3)",
        }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              marginBottom: "8px",
              color: "#f44336"
            }}>
              Delete Account
            </h3>
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "12px" }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <ul style={{ fontSize: "13px", color: "#888", marginLeft: "20px", marginBottom: "16px" }}>
              <li>Your account will be permanently deleted</li>
              <li>Workspaces you own will be transferred to other admins or deleted</li>
              <li>All your leads, campaigns, and data will be removed</li>
              <li>You will be removed from all teams</li>
            </ul>
          </div>

          {!showDeleteModal ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                background: "#f44336",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Delete My Account
            </button>
          ) : (
            <div style={{
              padding: "20px",
              borderRadius: "8px",
              background: "rgba(244, 67, 54, 0.1)",
              border: "1px solid rgba(244, 67, 54, 0.5)",
            }}>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
                Type <code style={{ background: "#fff", padding: "2px 6px", borderRadius: "4px", color: "#f44336" }}>DELETE</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(244, 67, 54, 0.5)",
                  marginBottom: "12px",
                  fontSize: "14px",
                }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    background: deleteConfirm === "DELETE" ? "#f44336" : "#ccc",
                    color: "#fff",
                    border: "none",
                    cursor: deleteConfirm === "DELETE" && !deleting ? "pointer" : "not-allowed",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {deleting ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm("");
                  }}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    background: "var(--color-surface-secondary)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
