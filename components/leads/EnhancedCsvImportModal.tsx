"use client";
import { useState, useEffect } from "react";
import { MicrosoftExcelBrandIcon } from "@/app/leads/components/LeadSourceBrandIcons";
import { ImportModalFrame, ImportModalStepper } from "@/components/leads/ImportModalChrome";
import { useBaseStore } from "@/stores/useBaseStore";
import { useColumnStore, BaseColumn, ColumnType } from "@/stores/useColumnStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { apiRequest } from "@/lib/apiClient";
import { UploadStep } from "./import/UploadStep";
import { MappingStep } from "./import/MappingStep";
import { ValidationStep } from "./import/ValidationStep";
import { ImportProgressStep } from "./import/ImportProgressStep";

type ImportStep = "upload" | "mapping" | "validation" | "importing";

const CSV_STEPS = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Map" },
  { key: "validation", label: "Review" },
  { key: "importing", label: "Import" },
];

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  targetColumn: string | null; // null = skip, "new:ColumnName" = create new, or existing column name
  columnType?: ColumnType;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export function EnhancedCsvImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const { activeBaseId } = useBaseStore();
  const { columns, fetchColumns } = useColumnStore();
  const { fetchLeads, pagination, clearCache } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  const confirm = useConfirm();

  const [step, setStep] = useState<ImportStep>("upload");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, isImporting: false });
  const [createdColumns, setCreatedColumns] = useState<BaseColumn[]>([]);

  // Fetch columns when base changes
  useEffect(() => {
    if (activeBaseId && open) {
      fetchColumns(activeBaseId);
    }
  }, [activeBaseId, open, fetchColumns]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setCsvFile(null);
      setCsvHeaders([]);
      setCsvRows([]);
      setMappings([]);
      setValidationErrors([]);
      setImportProgress({ current: 0, total: 0, isImporting: false });
      setCreatedColumns([]);
    }
  }, [open]);

  const handleFileUpload = (file: File, headers: string[], rows: CsvRow[]) => {
    setCsvFile(file);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setStep("mapping");
  };

  const handleMappingComplete = (newMappings: ColumnMapping[]) => {
    setMappings(newMappings);
    setStep("validation");
  };

  const handleValidationComplete = async (errors: ValidationError[], newColumns: BaseColumn[]) => {
    setValidationErrors(errors);
    setCreatedColumns(newColumns);

    let proceed = errors.length === 0;
    if (!proceed) {
      proceed = await confirm({
        title: "Validation warnings",
        message: `${errors.length} validation errors found. Continue import anyway?`,
        confirmLabel: "Continue import",
        variant: "danger",
      });
    }
    if (proceed) {
      setStep("importing");
      await performImport();
    }
  };

  const performImport = async () => {
    if (!activeBaseId || !csvRows.length) return;

    setImportProgress({ current: 0, total: csvRows.length, isImporting: true });

    try {
      // First, create any new columns
      const columnsToCreate = mappings.filter(m => m.targetColumn?.startsWith("new:"));
      const newColumnsMap: Record<string, BaseColumn> = {};

      for (const mapping of columnsToCreate) {
        if (mapping.targetColumn?.startsWith("new:")) {
          const columnName = mapping.targetColumn.replace("new:", "");
          try {
            const newColumn = await useColumnStore.getState().createColumn({
              base_id: activeBaseId,
              name: columnName,
              type: mapping.columnType || "text",
              visible: true,
            });
            if (newColumn) {
              newColumnsMap[mapping.csvColumn] = newColumn;
            }
          } catch (error) {
            console.error(`Failed to create column ${columnName}:`, error);
          }
        }
      }

      // Transform CSV rows to lead data
      const leadsToImport = csvRows.map((row, index) => {
        const leadData: any = {
          base_id: activeBaseId,
          custom_fields: {},
        };

        mappings.forEach((mapping) => {
          const value = row[mapping.csvColumn]?.trim();
          if (!value || !mapping.targetColumn) return;

          // System fields
          if (mapping.targetColumn === "first_name") leadData.first_name = value;
          else if (mapping.targetColumn === "last_name") leadData.last_name = value;
          else if (mapping.targetColumn === "email") leadData.email = value;
          else if (mapping.targetColumn === "phone") leadData.phone = value;
          else if (mapping.targetColumn === "linkedin_url") {
            leadData.enrichment = {
              ...(typeof leadData.enrichment === "object" && leadData.enrichment !== null
                ? leadData.enrichment
                : {}),
              linkedin_url: value,
            };
          } else if (mapping.targetColumn === "company") leadData.company = value;
          else if (mapping.targetColumn === "role") leadData.role = value;
          else if (mapping.targetColumn === "region") leadData.region = value;
          else if (mapping.targetColumn === "industry") leadData.industry = value;
          else if (mapping.targetColumn === "score") leadData.score = parseFloat(value) || null;
          else if (mapping.targetColumn === "tier") leadData.tier = value;
          // Custom fields
          else if (mapping.targetColumn.startsWith("new:")) {
            const columnName = mapping.targetColumn.replace("new:", "");
            const column = newColumnsMap[mapping.csvColumn];
            if (column) {
              // Convert value based on column type
              let convertedValue: any = value;
              if (column.type === "number") {
                convertedValue = parseFloat(value) || null;
              } else if (column.type === "checkbox") {
                convertedValue = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
              } else if (column.type === "date") {
                convertedValue = new Date(value).toISOString();
              }
              leadData.custom_fields[column.name] = convertedValue;
            }
          } else {
            // Existing custom column
            const column = columns.find(c => c.name === mapping.targetColumn);
            if (column) {
              let convertedValue: any = value;
              if (column.type === "number") {
                convertedValue = parseFloat(value) || null;
              } else if (column.type === "checkbox") {
                convertedValue = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
              } else if (column.type === "date") {
                convertedValue = new Date(value).toISOString();
              }
              leadData.custom_fields[column.name] = convertedValue;
            }
          }
        });

        return leadData;
      });

      // Import leads in batches
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < leadsToImport.length; i += batchSize) {
        const batch = leadsToImport.slice(i, i + batchSize);
        
        try {
          await Promise.all(
            batch.map(async (leadData) => {
              try {
                await apiRequest("/leads", {
                  method: "POST",
                  body: JSON.stringify(leadData),
                });
                successCount++;
              } catch (error) {
                console.error("Failed to import lead:", error);
                errorCount++;
              }
            })
          );
        } catch (error) {
          console.error("Batch import error:", error);
          errorCount += batch.length;
        }

        setImportProgress({ current: Math.min(i + batchSize, leadsToImport.length), total: leadsToImport.length, isImporting: true });
      }

      setImportProgress({ current: leadsToImport.length, total: leadsToImport.length, isImporting: false });

      if (errorCount === 0) {
        showSuccess("Import Complete", `Successfully imported ${successCount} leads.`);
      } else {
        showSuccess("Import Complete", `Imported ${successCount} leads. ${errorCount} failed.`);
      }

      // Refresh leads and columns
      if (activeBaseId) {
        // Clear cache to ensure fresh data
        clearCache(activeBaseId);
        // Force refresh with current pagination
        await fetchLeads(activeBaseId, pagination.currentPage, pagination.leadsPerPage, true);
        await fetchColumns(activeBaseId);
      }

      onImported();
      onClose();
    } catch (error: any) {
      showError("Import Failed", error?.message || "Failed to import leads");
      setImportProgress({ current: 0, total: 0, isImporting: false });
    }
  };

  const csvHeaderTint =
    "linear-gradient(165deg, rgba(33, 115, 70, 0.1) 0%, rgba(124, 58, 237, 0.06) 45%, transparent 72%)";

  return (
    <ImportModalFrame
      open={open}
      onClose={onClose}
      title="Import CSV"
      subtitle="Upload a file, map columns to your schema, review, then import into this workspace."
      headerTint={csvHeaderTint}
      icon={<MicrosoftExcelBrandIcon size={34} />}
      maxWidth={900}
      maxModalHeight="min(92vh, 920px)"
      wide
      stepper={<ImportModalStepper steps={CSV_STEPS} activeKey={step} />}
    >
      {step === "upload" && <UploadStep onFileUpload={handleFileUpload} onClose={onClose} />}

      {step === "mapping" && csvHeaders.length > 0 && (
        <MappingStep
          csvHeaders={csvHeaders}
          csvRows={csvRows.slice(0, 10)}
          baseColumns={columns}
          onMappingComplete={handleMappingComplete}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "validation" && mappings.length > 0 && (
        <ValidationStep
          csvRows={csvRows}
          mappings={mappings}
          baseColumns={columns}
          onValidationComplete={handleValidationComplete}
          onBack={() => setStep("mapping")}
        />
      )}

      {step === "importing" && (
        <ImportProgressStep
          progress={importProgress}
          onCancel={() => {
            setImportProgress({ current: 0, total: 0, isImporting: false });
            onClose();
          }}
        />
      )}
    </ImportModalFrame>
  );
}

