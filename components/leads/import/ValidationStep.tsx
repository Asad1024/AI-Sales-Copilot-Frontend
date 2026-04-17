"use client";
import { useState, useMemo, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { BaseColumn } from "@/stores/useColumnStore";

interface ValidationStepProps {
  csvRows: any[];
  mappings: ColumnMapping[];
  baseColumns: BaseColumn[];
  onValidationComplete: (errors: ValidationError[], newColumns: BaseColumn[]) => void;
  onBack: () => void;
}

interface ColumnMapping {
  csvColumn: string;
  targetColumn: string | null;
  columnType?: any;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export function ValidationStep({ csvRows, mappings, baseColumns, onValidationComplete, onBack }: ValidationStepProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [validating, setValidating] = useState(false);

  const validationResults = useMemo(() => {
    const validationErrors: ValidationError[] = [];
    const emailSet = new Set<string>();

    csvRows.forEach((row, index) => {
      mappings.forEach((mapping) => {
        if (!mapping.targetColumn || mapping.targetColumn === "new") return;

        const value = row[mapping.csvColumn]?.trim();
        const rowNum = index + 2; // +2 because CSV is 1-indexed and has header

        // Email validation
        if (mapping.targetColumn === "email" && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            validationErrors.push({
              row: rowNum,
              column: mapping.csvColumn,
              message: `Invalid email format: ${value}`,
            });
          } else if (emailSet.has(value.toLowerCase())) {
            validationErrors.push({
              row: rowNum,
              column: mapping.csvColumn,
              message: `Duplicate email: ${value}`,
            });
          } else {
            emailSet.add(value.toLowerCase());
          }
        }

        // Number validation
        if (mapping.targetColumn === "score" && value) {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0 || num > 100) {
            validationErrors.push({
              row: rowNum,
              column: mapping.csvColumn,
              message: `Score must be between 0-100: ${value}`,
            });
          }
        }

        // Required field validation (email is required)
        if (mapping.targetColumn === "email" && !value) {
          validationErrors.push({
            row: rowNum,
            column: mapping.csvColumn,
            message: "Email is required",
          });
        }
      });
    });

    return validationErrors;
  }, [csvRows, mappings]);

  useEffect(() => {
    setErrors(validationResults);
  }, [validationResults]);

  const handleContinue = () => {
    // Extract new columns that need to be created
    const newColumns: BaseColumn[] = [];
    mappings.forEach((mapping) => {
      if (mapping.targetColumn?.startsWith("new:")) {
        const columnName = mapping.targetColumn.replace("new:", "");
        // This will be created during import, so we just track it here
      }
    });
    onValidationComplete(errors, newColumns);
  };

  const validRows = csvRows.length - new Set(errors.map(e => e.row)).size;
  const invalidRows = new Set(errors.map(e => e.row)).size;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Data Validation</h3>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
          Review validation results before importing.
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <div className="card-enhanced" style={{ padding: "16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#2563EB" }}>{csvRows.length}</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Total Rows</div>
        </div>
        <div className="card-enhanced" style={{ padding: "16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#66bb6a" }}>{validRows}</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Valid Rows</div>
        </div>
        <div className="card-enhanced" style={{ padding: "16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#ef5350" }}>{errors.length}</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Errors</div>
        </div>
      </div>

      {/* Errors List */}
      {errors.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Validation Errors</h4>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--elev-border)", borderRadius: "8px" }}>
            {errors.slice(0, 50).map((error, index) => (
              <div
                key={index}
                style={{
                  padding: "12px",
                  borderBottom: index < errors.length - 1 ? "1px solid var(--elev-border)" : "none",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "#ef5350", fontWeight: "600", minWidth: "60px" }}>Row {error.row}</span>
                  <span style={{ color: "var(--color-text-muted)", minWidth: "120px" }}>{error.column}:</span>
                  <span style={{ color: "var(--color-text)" }}>{error.message}</span>
                </div>
              </div>
            ))}
            {errors.length > 50 && (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--color-text-muted)" }}>
                ... and {errors.length - 50} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {errors.length === 0 && (
        <div style={{
          padding: "24px",
          background: "rgba(102, 187, 106, 0.1)",
          border: "1px solid rgba(102, 187, 106, 0.3)",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <Icons.CheckCircle size={32} style={{ color: "#66bb6a", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#66bb6a" }}>
            All data is valid! Ready to import.
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "24px" }}>
        <button onClick={onBack} className="btn-ghost">
          <Icons.ChevronLeft size={16} style={{ marginRight: "6px" }} />
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          {errors.length > 0 ? "Import Anyway" : "Start Import"}
          <Icons.ChevronRight size={16} style={{ marginLeft: "6px" }} />
        </button>
      </div>
    </div>
  );
}

