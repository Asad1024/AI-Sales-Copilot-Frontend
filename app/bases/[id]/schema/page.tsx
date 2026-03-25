"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useColumnStore, BaseColumn, ColumnType } from "@/stores/useColumnStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { ColumnList } from "./components/ColumnList";
import { ColumnEditorModal } from "./components/ColumnEditorModal";
import { StatusFieldHelper } from "./components/StatusFieldHelper";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function BaseSchemaPage() {
  const router = useRouter();
  const params = useParams();
  const baseId = params?.id ? parseInt(params.id as string) : null;
  const { columns, loading, fetchColumns } = useColumnStore();
  const { permissions } = useBasePermissions(baseId);
  const { showSuccess, showError } = useNotification();
  const [editingColumn, setEditingColumn] = useState<BaseColumn | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (baseId) {
      fetchColumns(baseId);
    }
  }, [baseId, fetchColumns]);

  if (!baseId) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Invalid base ID</p>
      </div>
    );
  }

  if (!permissions.canEditSchema) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to manage the schema for this base.</p>
        <button onClick={() => router.back()} className="btn-primary" style={{ marginTop: "20px" }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "4px 0 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <button
            onClick={() => router.back()}
            className="btn-ghost"
            style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Icons.ChevronLeft size={16} />
            Back
          </button>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginTop: "8px" }}>
            Manage columns, field types, and data structure for this base
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Icons.Plus size={16} />
          Add Column
        </button>
      </div>

      {/* Status Field Helper */}
      {!loading && columns.length === 0 && (
        <StatusFieldHelper
          baseId={baseId}
          onCreated={() => {
            fetchColumns(baseId);
            showSuccess("Status Field Created", "You can now use this status field in your leads.");
          }}
        />
      )}

      {/* Columns List */}
      {loading ? (
        <div className="card-enhanced" style={{ borderRadius: 16, padding: 24, overflow: "hidden" }}>
          <div style={{ marginBottom: 20 }}>
            <div className="ui-skeleton" style={{ height: 20, width: 200, borderRadius: 8, marginBottom: 10 }} aria-hidden />
            <div className="ui-skeleton" style={{ height: 14, width: "min(360px, 90%)", borderRadius: 6 }} aria-hidden />
          </div>
          <TableSkeleton columns={6} rows={8} withCard={false} trailingActions ariaLabel="Loading columns" />
        </div>
      ) : (
        <>
          <ColumnList
            columns={columns}
            baseId={baseId}
            onEdit={(column) => setEditingColumn(column)}
            onDelete={() => {
              fetchColumns(baseId);
            }}
            onAddColumn={() => setShowAddModal(true)}
          />
          {columns.length > 0 && (
            <StatusFieldHelper
              baseId={baseId}
              onCreated={() => {
                fetchColumns(baseId);
                showSuccess("Status Field Created", "You can now use this status field in your leads.");
              }}
            />
          )}
        </>
      )}

      {/* Add Column Modal */}
      {showAddModal && (
        <ColumnEditorModal
          baseId={baseId}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchColumns(baseId);
            showSuccess("Column Added", "The new column has been added successfully.");
          }}
        />
      )}

      {/* Edit Column Modal */}
      {editingColumn && (
        <ColumnEditorModal
          baseId={baseId}
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
          onSave={() => {
            setEditingColumn(null);
            fetchColumns(baseId);
            showSuccess("Column Updated", "The column has been updated successfully.");
          }}
        />
      )}
    </div>
  );
}

