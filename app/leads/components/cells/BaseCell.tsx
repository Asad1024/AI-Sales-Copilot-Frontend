"use client";
import { useState } from "react";
import { BaseColumn, ColumnType } from "@/stores/useColumnStore";
import { Lead } from "@/stores/useLeadStore";
import { TextCell } from "./TextCell";
import { NumberCell } from "./NumberCell";
import { DateCell } from "./DateCell";
import { SelectCell } from "./SelectCell";
import { StatusCell } from "./StatusCell";
import { MultiSelectCell } from "./MultiSelectCell";
import { CheckboxCell } from "./CheckboxCell";
import { RatingCell } from "./RatingCell";

interface BaseCellProps {
  column: BaseColumn;
  lead: Lead;
  value: any;
  onUpdate: (leadId: number, columnName: string, value: any) => void;
  editable?: boolean;
}

export function BaseCell({ column, lead, value, onUpdate, editable = true }: BaseCellProps) {
  const handleUpdate = (newValue: any) => {
    if (editable) {
      onUpdate(lead.id, column.name, newValue);
    }
  };

  switch (column.type) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return <TextCell value={value} onUpdate={handleUpdate} editable={editable} type={column.type} />;
    
    case "number":
      return (
        <NumberCell
          value={value}
          onUpdate={handleUpdate}
          editable={editable}
          min={column.config?.min}
          max={column.config?.max}
        />
      );
    
    case "date":
      return <DateCell value={value} onUpdate={handleUpdate} editable={editable} />;
    
    case "select":
    case "single_select":
      return (
        <SelectCell
          value={value}
          onUpdate={handleUpdate}
          editable={editable}
          options={column.options || column.config?.options || []}
        />
      );
    
    case "status":
      return (
        <StatusCell
          value={value}
          onUpdate={handleUpdate}
          editable={editable}
          options={Array.isArray(column.config?.options) ? column.config.options : []}
        />
      );
    
    case "multiselect":
    case "multi_select":
      return (
        <MultiSelectCell
          value={value}
          onUpdate={handleUpdate}
          editable={editable}
          options={column.options || column.config?.options || []}
        />
      );
    
    case "checkbox":
      return <CheckboxCell value={value} onUpdate={handleUpdate} editable={editable} />;
    
    case "rating":
      return (
        <RatingCell
          value={value}
          onUpdate={handleUpdate}
          editable={editable}
          max={column.config?.max || 5}
        />
      );
    
    case "formula":
      // Formulas are read-only, computed values
      return <div style={{ fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
        {value || "—"}
      </div>;
    
    default:
      return <div style={{ fontSize: "13px" }}>{value || "—"}</div>;
  }
}

