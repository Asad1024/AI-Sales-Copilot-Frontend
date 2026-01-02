"use client";
import { ColumnType } from "@/stores/useColumnStore";
import { Icons } from "@/components/ui/Icons";

interface ColumnTypeSelectorProps {
  value: ColumnType;
  onChange: (type: ColumnType) => void;
}

const columnTypes: Array<{ 
  value: ColumnType; 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  color: string;
}> = [
  { 
    value: "text", 
    label: "Text", 
    description: "Single line text", 
    icon: <Icons.FileText size={18} />,
    color: "#6366f1"
  },
  { 
    value: "number", 
    label: "Number", 
    description: "Numeric values", 
    icon: <span style={{ fontSize: 14, fontWeight: 700 }}>#</span>,
    color: "#0891b2"
  },
  { 
    value: "date", 
    label: "Date", 
    description: "Dates & times", 
    icon: <Icons.Calendar size={18} />,
    color: "#0d9488"
  },
  { 
    value: "email", 
    label: "Email", 
    description: "Email addresses", 
    icon: <Icons.Mail size={18} />,
    color: "#2563eb"
  },
  { 
    value: "phone", 
    label: "Phone", 
    description: "Phone numbers", 
    icon: <Icons.Phone size={18} />,
    color: "#7c3aed"
  },
  { 
    value: "url", 
    label: "URL", 
    description: "Web links", 
    icon: <Icons.ExternalLink size={18} />,
    color: "#059669"
  },
  { 
    value: "select", 
    label: "Select", 
    description: "Single choice", 
    icon: <Icons.ChevronDown size={18} />,
    color: "#d97706"
  },
  { 
    value: "status", 
    label: "Status", 
    description: "Color-coded status", 
    icon: <Icons.Circle size={18} />,
    color: "#dc2626"
  },
  { 
    value: "multiselect", 
    label: "Multi-select", 
    description: "Multiple choices", 
    icon: <Icons.CheckCircle size={18} />,
    color: "#ea580c"
  },
  { 
    value: "checkbox", 
    label: "Checkbox", 
    description: "Yes / No", 
    icon: <Icons.Check size={18} />,
    color: "#16a34a"
  },
  { 
    value: "rating", 
    label: "Rating", 
    description: "1-5 stars", 
    icon: <Icons.Star size={18} />,
    color: "#eab308"
  },
  { 
    value: "formula", 
    label: "Formula", 
    description: "Computed value", 
    icon: <Icons.Sparkles size={18} />,
    color: "#8b5cf6"
  },
];

export function ColumnTypeSelector({ value, onChange }: ColumnTypeSelectorProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
      {columnTypes.map((type) => {
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            style={{
              padding: "14px 12px",
              borderRadius: "8px",
              border: isSelected 
                ? `2px solid ${type.color}` 
                : "1px solid var(--color-border)",
              background: isSelected 
                ? `${type.color}10` 
                : "var(--color-surface)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = type.color;
                e.currentTarget.style.background = `${type.color}08`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-surface)';
              }
            }}
          >
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              background: isSelected ? type.color : `${type.color}15`,
              color: isSelected ? '#fff' : type.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {type.icon}
            </div>
            <div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600",
                color: isSelected ? type.color : 'var(--color-text)',
              }}>
                {type.label}
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: "var(--color-text-muted)",
                marginTop: 2,
              }}>
                {type.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
