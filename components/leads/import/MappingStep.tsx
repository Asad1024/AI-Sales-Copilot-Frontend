"use client";
import { useState, useEffect, useMemo } from "react";
import { Icons } from "@/components/ui/Icons";
import { BaseColumn, ColumnType } from "@/stores/useColumnStore";

interface MappingStepProps {
  csvHeaders: string[];
  csvRows: any[];
  baseColumns: BaseColumn[];
  onMappingComplete: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
}

interface ColumnMapping {
  csvColumn: string;
  targetColumn: string | null;
  columnType?: ColumnType;
}

const SYSTEM_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role/Title" },
  { value: "region", label: "Region" },
  { value: "industry", label: "Industry" },
  { value: "score", label: "AI Score" },
  { value: "tier", label: "Tier" },
];

const columnTypes: Array<{ value: ColumnType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
  { value: "status", label: "Status" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "rating", label: "Rating" },
];

// Auto-detect field type from CSV column name and sample data
function detectColumnType(columnName: string, sampleValues: string[]): ColumnType {
  const nameLower = columnName.toLowerCase();
  
  if (nameLower.includes("email")) return "email";
  if (nameLower.includes("phone") || nameLower.includes("tel")) return "phone";
  if (nameLower.includes("url") || nameLower.includes("link") || nameLower.includes("website")) return "url";
  if (nameLower.includes("date")) return "date";
  
  // Check sample values
  const numericCount = sampleValues.filter(v => !isNaN(parseFloat(v)) && v.trim() !== "").length;
  if (numericCount > sampleValues.length * 0.8) return "number";
  
  return "text";
}

export function MappingStep({ csvHeaders, csvRows, baseColumns, onMappingComplete, onBack }: MappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [creatingColumns, setCreatingColumns] = useState<Record<string, boolean>>({});

  // Initialize mappings with auto-detection
  useEffect(() => {
    const initialMappings: ColumnMapping[] = csvHeaders.map((header) => {
      const sampleValues = csvRows.slice(0, 5).map(row => row[header] || "").filter(Boolean);
      const detectedType = detectColumnType(header, sampleValues);
      
      // Try to auto-map to system fields
      const headerLower = header.toLowerCase();
      let targetColumn: string | null = null;
      
      if (headerLower.includes("first") || headerLower.includes("fname")) {
        targetColumn = "first_name";
      } else if (headerLower.includes("last") || headerLower.includes("lname")) {
        targetColumn = "last_name";
      } else if (headerLower.includes("email") || headerLower.match(/^e-?mail$/i)) {
        targetColumn = "email";
      } else if (headerLower.includes("phone") || headerLower.includes("tel")) {
        targetColumn = "phone";
      } else if (headerLower.includes("linkedin")) {
        targetColumn = "linkedin_url";
      } else if (headerLower.includes("company") || headerLower.includes("organization")) {
        targetColumn = "company";
      } else if (headerLower.includes("role") || headerLower.includes("title") || headerLower.includes("position")) {
        targetColumn = "role";
      } else {
        // Try to match existing custom column
        const matchingColumn = baseColumns.find(col => 
          col.name.toLowerCase() === headerLower || 
          col.name.toLowerCase().includes(headerLower) ||
          headerLower.includes(col.name.toLowerCase())
        );
        if (matchingColumn) {
          targetColumn = matchingColumn.name;
        }
      }

      return {
        csvColumn: header,
        targetColumn: targetColumn,
        columnType: detectedType,
      };
    });

    setMappings(initialMappings);
  }, [csvHeaders, csvRows, baseColumns]);

  const handleMappingChange = (csvColumn: string, targetColumn: string | null, columnType?: ColumnType) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn
          ? { ...m, targetColumn, columnType: columnType || m.columnType }
          : m
      )
    );
  };

  const handleContinue = () => {
    onMappingComplete(mappings);
  };

  const allTargetOptions = useMemo(() => {
    const systemOptions = SYSTEM_FIELDS.map(f => ({ value: f.value, label: f.label, type: "system" as const }));
    const customOptions = baseColumns.map(col => ({ value: col.name, label: col.name, type: "custom" as const }));
    return [
      { value: null, label: "— Skip —", type: "skip" as const },
      ...systemOptions,
      ...customOptions,
      { value: "new", label: "+ Create New Column", type: "new" as const },
    ];
  }, [baseColumns]);

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Map CSV Columns</h3>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
          Map each CSV column to a field in your base. Unmapped columns will be skipped.
        </p>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--elev-border)" }}>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)" }}>CSV Column</th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)" }}>Sample Data</th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)" }}>Map To</th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)" }}>Type (if new)</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => {
              const sampleValue = csvRows[0]?.[mapping.csvColumn] || "";
              const isCreatingNew = mapping.targetColumn === "new";
              const showTypeSelector = isCreatingNew || mapping.targetColumn?.startsWith("new:");

              return (
                <tr key={mapping.csvColumn} style={{ borderBottom: "1px solid var(--elev-border)" }}>
                  <td style={{ padding: "12px", fontSize: "13px", fontWeight: "500" }}>{mapping.csvColumn}</td>
                  <td style={{ padding: "12px", fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sampleValue || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {isCreatingNew ? (
                      <div>
                        <input
                          type="text"
                          placeholder="New column name..."
                          value={mapping.targetColumn?.replace("new:", "") || ""}
                          onChange={(e) => {
                            const newName = e.target.value.trim();
                            handleMappingChange(
                              mapping.csvColumn,
                              newName ? `new:${newName}` : "new",
                              mapping.columnType
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--elev-border)",
                            background: "var(--color-surface-secondary)",
                            fontSize: "13px",
                            marginBottom: "8px",
                          }}
                        />
                        <select
                          value={mapping.columnType || "text"}
                          onChange={(e) => handleMappingChange(mapping.csvColumn, mapping.targetColumn || "new", e.target.value as ColumnType)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--elev-border)",
                            background: "var(--color-surface-secondary)",
                            fontSize: "13px",
                          }}
                        >
                          {columnTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={mapping.targetColumn || ""}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          if (value === "new") {
                            handleMappingChange(mapping.csvColumn, "new", mapping.columnType);
                          } else {
                            handleMappingChange(mapping.csvColumn, value, mapping.columnType);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--elev-border)",
                          background: "var(--color-surface-secondary)",
                          fontSize: "13px",
                        }}
                      >
                        {allTargetOptions.map((opt) => (
                          <option key={opt.value || "skip"} value={opt.value || ""}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {showTypeSelector ? (
                      <span style={{
                        background: "rgba(76, 103, 255, 0.1)",
                        color: "#4C67FF",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "500",
                      }}>
                        {mapping.columnType || "text"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "24px" }}>
        <button onClick={onBack} className="btn-ghost">
          <Icons.ChevronLeft size={16} style={{ marginRight: "6px" }} />
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue to Validation
          <Icons.ChevronRight size={16} style={{ marginLeft: "6px" }} />
        </button>
      </div>
    </div>
  );
}

