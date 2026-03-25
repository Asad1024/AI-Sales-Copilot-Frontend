"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import AdminGuard from "@/components/auth/AdminGuard";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  company?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    company: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest("/admin/users");
      const usersList = Array.isArray(data) ? data : (data?.users || []);
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "", role: "user", company: "" });
      fetchUsers();
    } catch (error: any) {
      showError("Create failed", error.message || "Failed to create user");
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: user.role === "admin" ? "user" : "admin" })
      });
      fetchUsers();
      showSuccess("User updated", "Role was changed.");
    } catch (error: any) {
      showError("Update failed", error.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    const ok = await confirm({
      title: "Delete user?",
      message: "This permanently removes the user from the platform.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: "DELETE" });
      fetchUsers();
      showSuccess("User deleted", "The user was removed.");
    } catch (error: any) {
      showError("Delete failed", error.message || "Failed to delete user");
    }
  };

  return (
    <AdminGuard>
      <div style={{ padding: "12px 20px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>User Management</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "16px" }}>
              Manage all users and their permissions
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>

        {loading ? (
          <div style={{
            background: "var(--color-surface)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            overflow: "hidden"
          }}>
            <TableSkeleton columns={6} rows={10} withCard={false} trailingActions ariaLabel="Loading users" />
          </div>
        ) : (
          <div style={{
            background: "var(--color-surface)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Name</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Email</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Role</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Company</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>Created</th>
                  <th style={{ padding: "16px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px", fontSize: "14px" }}>{user.name}</td>
                    <td style={{ padding: "16px", fontSize: "14px" }}>{user.email}</td>
                    <td style={{ padding: "16px", fontSize: "14px" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: user.role === "admin" ? "rgba(169, 76, 255, 0.2)" : "rgba(76, 103, 255, 0.2)",
                        color: user.role === "admin" ? "#A94CFF" : "#4C67FF"
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                      {user.company || "-"}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          className="btn-ghost"
                          onClick={() => handleUpdateUser(user)}
                          style={{ fontSize: "12px" }}
                        >
                          {user.role === "admin" ? "Make User" : "Make Admin"}
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => handleDeleteUser(user.id)}
                          style={{ fontSize: "12px", color: "#ff6b6b" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}>
            <div style={{
              background: "var(--color-surface)",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "500px",
              border: "1px solid var(--color-border)"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Add New User</h2>
              <form onSubmit={handleCreateUser}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                  <input
                    className="input"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    className="input"
                    placeholder="Company (optional)"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}

