"use client";

interface CheckboxCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
}

export function CheckboxCell({ value, onUpdate, editable = true }: CheckboxCellProps) {
  const checked = Boolean(value);

  const handleToggle = () => {
    if (editable) {
      onUpdate(!checked);
    }
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        cursor: editable ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleToggle}
        disabled={!editable}
        style={{
          width: "18px",
          height: "18px",
          cursor: editable ? "pointer" : "default",
        }}
      />
    </div>
  );
}

