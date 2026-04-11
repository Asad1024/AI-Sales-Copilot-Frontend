"use client";
import { useState, useRef } from "react";
import { Icons } from "@/components/ui/Icons";

interface UploadStepProps {
  onFileUpload: (file: File, headers: string[], rows: any[]) => void;
  onClose: () => void;
}

// Proper CSV parser that handles quoted fields, commas, and escaped quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export function UploadStep({ onFileUpload, onClose }: UploadStepProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError("Please upload a CSV file");
      return;
    }

    setParsing(true);
    setError("");

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
        setError("CSV file must have at least a header row and one data row");
        setParsing(false);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      if (headers.length === 0) {
        setError("CSV file must have column headers");
        setParsing(false);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
          // Pad or truncate to match headers
          while (values.length < headers.length) values.push("");
          values.splice(headers.length);
        }
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }

      onFileUpload(file, headers, rows);
    } catch (err: any) {
      setError(err?.message || "Failed to parse CSV file");
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#7C3AED" : "var(--elev-border)"}`,
          borderRadius: "12px",
          padding: "60px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(124, 58, 237, 0.05)" : "var(--color-surface-secondary)",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        {parsing ? (
          <>
            <Icons.Loader size={48} className="animate-spin" style={{ marginBottom: "16px", color: "#7C3AED" }} />
            <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>Parsing CSV file...</div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Please wait</div>
          </>
        ) : (
          <>
            <Icons.FileText size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>
              Drop your CSV file here
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
              or click to browse
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              CSV files only • First row should be headers
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(239, 83, 80, 0.1)",
            border: "1px solid rgba(239, 83, 80, 0.3)",
            borderRadius: "8px",
            color: "#ef5350",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
        <button onClick={onClose} className="btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

