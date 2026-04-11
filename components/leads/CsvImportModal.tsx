"use client";
import React, { useState, useMemo } from "react";
import { Icons } from "@/components/ui/Icons";

type CsvImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (rows: any[]) => void;
  importProgress?: {
    current: number;
    total: number;
    isImporting: boolean;
  };
  onCancel?: () => void;
};

type FieldMapping = {
  [csvColumn: string]: string; // Maps CSV column name to our field name
};

// Field detection patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]+$/;
const NAME_KEYWORDS = ['name', 'first', 'last', 'fname', 'lname', 'firstname', 'lastname', 'fullname'];
const COMPANY_KEYWORDS = ['company', 'organization', 'org', 'business', 'firm'];
const ROLE_KEYWORDS = ['role', 'title', 'position', 'job', 'designation'];
const REGION_KEYWORDS = ['region', 'country', 'location', 'city', 'state'];
const INDUSTRY_KEYWORDS = ['industry', 'sector', 'vertical'];
const LINKEDIN_KEYWORDS = ['linkedin', 'linked-in', 'li'];
const TWITTER_KEYWORDS = ['twitter', 'x.com', 'x_handle'];
const GITHUB_KEYWORDS = ['github', 'git'];
const FACEBOOK_KEYWORDS = ['facebook', 'fb'];

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
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  return result;
}

// Analyze CSV columns to detect field types
function analyzeColumns(headers: string[], sampleRows: any[]): FieldMapping {
  const mapping: FieldMapping = {};
  const columnStats: { [key: string]: { email: number; phone: number; name: number; company: number; role: number; region: number; industry: number } } = {};
  
  // Initialize stats
  headers.forEach(header => {
    columnStats[header] = { email: 0, phone: 0, name: 0, company: 0, role: 0, region: 0, industry: 0 };
  });
  
  // Analyze sample data (first 10 rows or all if less)
  const samples = sampleRows.slice(0, Math.min(10, sampleRows.length));
  
  samples.forEach(row => {
    headers.forEach(header => {
      const value = String(row[header] || '').trim().toLowerCase();
      const headerLower = header.toLowerCase();
      
      // Check for email
      if (EMAIL_REGEX.test(row[header])) {
        columnStats[header].email++;
      }
      
      // Check for phone (has digits and common phone chars)
      if (row[header] && PHONE_REGEX.test(row[header]) && row[header].replace(/\D/g, '').length >= 7) {
        columnStats[header].phone++;
      }
      
      // Check header name for keywords
      if (NAME_KEYWORDS.some(kw => headerLower.includes(kw))) {
        columnStats[header].name++;
      }
      if (COMPANY_KEYWORDS.some(kw => headerLower.includes(kw))) {
        columnStats[header].company++;
      }
      if (ROLE_KEYWORDS.some(kw => headerLower.includes(kw))) {
        columnStats[header].role++;
      }
      if (REGION_KEYWORDS.some(kw => headerLower.includes(kw))) {
        columnStats[header].region++;
      }
      if (INDUSTRY_KEYWORDS.some(kw => headerLower.includes(kw))) {
        columnStats[header].industry++;
      }
    });
  });
  
  // Determine mappings based on analysis
  headers.forEach(header => {
    const stats = columnStats[header];
    const headerLower = header.toLowerCase();
    
    // Email detection (highest priority if found)
    if (stats.email > 0 && !mapping[header]) {
      mapping[header] = 'email';
    }
    // Phone detection
    else if (stats.phone > 0 && !mapping[header] && headerLower.includes('phone')) {
      mapping[header] = 'phone';
    }
    // Name detection
    else if (headerLower.includes('first') || headerLower.includes('fname') || headerLower.includes('firstname')) {
      mapping[header] = 'first_name';
    }
    else if (headerLower.includes('last') || headerLower.includes('lname') || headerLower.includes('lastname')) {
      mapping[header] = 'last_name';
    }
    else if (headerLower.includes('name') && !mapping[header]) {
      mapping[header] = 'name'; // Full name
    }
    // Company detection
    else if (stats.company > 0 || COMPANY_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'company';
    }
    // Role detection
    else if (stats.role > 0 || ROLE_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'role';
    }
    // Region detection
    else if (stats.region > 0 || REGION_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'region';
    }
    // Industry detection
    else if (stats.industry > 0 || INDUSTRY_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'industry';
    }
    // Social media detection
    else if (LINKEDIN_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'linkedin_url';
    }
    else if (TWITTER_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'twitter_url';
    }
    else if (GITHUB_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'github_url';
    }
    else if (FACEBOOK_KEYWORDS.some(kw => headerLower.includes(kw))) {
      mapping[header] = 'facebook_url';
    }
  });
  
  return mapping;
}

export default function CsvImportModal({ open, onClose, onImported, importProgress, onCancel }: CsvImportModalProps) {
  const [fileName, setFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string>("");
  const [showMapping, setShowMapping] = useState(false);
  const [importLimit, setImportLimit] = useState<string>("");

  // Available target fields
  const targetFields = [
    { value: '', label: '-- Skip --' },
    { value: 'email', label: 'Email' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'name', label: 'Full Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' },
    { value: 'role', label: 'Role/Title' },
    { value: 'region', label: 'Region' },
    { value: 'industry', label: 'Industry' },
    { value: 'linkedin_url', label: 'LinkedIn URL' },
    { value: 'twitter_url', label: 'Twitter URL' },
    { value: 'github_url', label: 'GitHub URL' },
    { value: 'facebook_url', label: 'Facebook URL' },
    { value: 'score', label: 'Score' },
    { value: 'tier', label: 'Tier' }
  ];

  // Transform rows based on field mapping
  const mappedRows = useMemo(() => {
    if (!rawRows.length || !headers.length) return [];
    
    const allMapped = rawRows.map(row => {
      const mapped: any = {};
      headers.forEach(header => {
        const targetField = fieldMapping[header];
        if (targetField && targetField !== '') {
          const value = row[header] || '';
          
          // Handle full name splitting
          if (targetField === 'name' && value) {
            const parts = value.trim().split(/\s+/);
            if (parts.length > 0) mapped.first_name = parts[0];
            if (parts.length > 1) mapped.last_name = parts.slice(1).join(' ');
          } else if (targetField) {
            mapped[targetField] = value;
          }
        }
      });
      return mapped;
    });
    
    // Apply import limit if specified
    if (importLimit && importLimit.trim() !== '') {
      const limit = parseInt(importLimit);
      if (!isNaN(limit) && limit > 0) {
        return allMapped.slice(0, limit);
      }
    }
    
    return allMapped;
  }, [rawRows, headers, fieldMapping, importLimit]);

  const parseCsv = async (file: File) => {
    setParsing(true);
    setError("");
    setFileName(file.name);
    setRawRows([]);
    setHeaders([]);
    setFieldMapping({});
    setShowMapping(false);
    setImportLimit(""); // Reset import limit when new file is selected
    
    try {
    const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        setError("CSV file is empty");
        setParsing(false);
        return;
      }
      
      // Parse header
      const parsedHeaders = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
      
      if (parsedHeaders.length === 0) {
        setError("CSV file has no headers");
        setParsing(false);
        return;
      }
      
      // Parse data rows
      const data = lines.slice(1)
        .map((line, idx) => {
          try {
            const cells = parseCSVLine(line).map(cell => cell.replace(/^"|"$/g, '').trim());
      const obj: any = {};
            parsedHeaders.forEach((h, idx) => {
              obj[h] = cells[idx] || "";
            });
      return obj;
          } catch (e) {
            console.warn(`Error parsing line ${idx + 2}:`, e);
            return null;
          }
        })
        .filter(row => row !== null);
      
      if (data.length === 0) {
        setError("No valid data rows found in CSV");
        setParsing(false);
        return;
      }
      
      // Analyze columns and auto-detect field mappings
      const autoMapping = analyzeColumns(parsedHeaders, data);
      
      setHeaders(parsedHeaders);
      setRawRows(data);
      setFieldMapping(autoMapping);
      setShowMapping(true);
    } catch (err: any) {
      console.error('CSV parsing error:', err);
      setError(err.message || "Failed to parse CSV file. Please check the file format.");
    } finally {
    setParsing(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,.55)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex:1000, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        padding:'20px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ 
        width:'min(900px, 96vw)', 
        maxWidth: '96vw',
        maxHeight: '90vh',
        background:'var(--color-surface)', 
        border:'1px solid var(--color-border)', 
        borderRadius:16, 
        padding:0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px var(--color-shadow)'
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(124, 58, 237, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icons.Upload size={20} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Import CSV
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Upload a file — we&apos;ll suggest column mappings you can adjust before importing.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ 
              width: 36,
              height: 36,
              padding: 0,
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* Scrollable Content */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 8,
          marginRight: -8
        }}>
          {/* File Upload Section */}
          <div style={{ 
            marginBottom: 20,
            padding: 20,
            background: 'var(--color-surface-secondary)',
            borderRadius: 12,
            border: '1px dashed var(--color-border)',
            textAlign: 'center',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px 0' }}>
                {fileName || 'Select CSV File'}
              </p>
              {!fileName && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                  Drag and drop or click to browse
                </p>
              )}
            </div>
            <label style={{ 
              display: 'inline-block',
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {fileName ? 'Change File' : 'Choose File'}
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e)=>{ 
                  const f=e.target.files?.[0]; 
                  if (f) parseCsv(f); 
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>
            {fileName && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                ✓ {fileName} ({rawRows.length} rows detected)
              </div>
            )}
        </div>

          {/* Parsing Indicator */}
          {parsing && (
            <div style={{ 
              padding: 16, 
              background: 'rgba(124, 58, 237, 0.1)', 
              borderRadius: 12, 
              textAlign: 'center',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Parsing CSV file...</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Analyzing columns and detecting field types</div>
            </div>
          )}

          {/* Import Progress Indicator */}
          {importProgress?.isImporting && (
            <div style={{ 
              padding: 20, 
              background: 'var(--color-surface-secondary)', 
              borderRadius: 12, 
              border: '1px solid var(--color-border)',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{ fontSize: 24 }}>📤</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Importing Leads...</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {importProgress.current} of {importProgress.total} leads processed
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                  </div>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255, 107, 107, 0.2)',
                        border: '1px solid rgba(255, 107, 107, 0.5)',
                        borderRadius: 8,
                        color: '#ff6b6b',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 107, 107, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                      }}
                    >
                      ✕ Cancel Import
                    </button>
                  )}
                </div>
        </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: 10,
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: 5,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: 5,
                  transition: 'width 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: 'shimmer 2s infinite'
                  }} />
                </div>
        </div>

              <style dangerouslySetInnerHTML={{__html: `
                @keyframes shimmer {
                  0% { left: -100%; }
                  100% { left: 100%; }
                }
              `}} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(255, 107, 107, 0.1)', 
              border: '1px solid rgba(255, 107, 107, 0.3)', 
              borderRadius: '12px', 
              color: '#ff6b6b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Error</div>
                <div style={{ fontSize: 13 }}>{error}</div>
              </div>
            </div>
          )}

          {/* Field Mapping Section */}
          {rawRows.length > 0 && showMapping && (
            <div>
              <div style={{ 
                marginBottom: 20,
                padding: 16,
                background: 'var(--color-surface-secondary)',
                borderRadius: 12,
                border: '1px solid var(--color-border)'
              }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📊</span> AI Detected Field Mappings
                </h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                  We've automatically detected which columns contain emails, names, and other data. Review and adjust if needed.
                </p>
                <div style={{ 
                  display: 'grid', 
                  gap: 10, 
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingRight: 8,
                  marginRight: -8
                }}>
                  {headers.map(header => {
                    const detectedField = fieldMapping[header];
                    const sampleValue = rawRows[0]?.[header] || '';
                    return (
                      <div 
                        key={header} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: 8,
                          padding: '12px', 
                          background: detectedField ? 'rgba(124, 58, 237, 0.08)' : 'var(--color-surface)', 
                          borderRadius: 8,
                          border: detectedField ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>CSV Column</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{header}</div>
                          </div>
                          {sampleValue && (
                            <div style={{ flex: 1, minWidth: 150 }}>
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Sample Value</div>
                              <div style={{ 
                                fontSize: 12, 
                                color: 'var(--color-text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 200
                              }}>
                                {sampleValue}
                              </div>
                            </div>
                          )}
                          <div style={{ minWidth: 180 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Map To</div>
                            <select
                              className="input"
                              value={fieldMapping[header] || ''}
                              onChange={(e) => {
                                setFieldMapping(prev => ({
                                  ...prev,
                                  [header]: e.target.value
                                }));
                              }}
                              style={{ 
                                width: '100%',
                                fontSize: 13,
                                padding: '8px 12px'
                              }}
                            >
                              {targetFields.map(field => (
                                <option key={field.value} value={field.value}>{field.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {detectedField && (
                          <div style={{ 
                            fontSize: 11, 
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            ✓ Auto-detected as: <strong>{targetFields.find(f => f.value === detectedField)?.label}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Preview Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 12 
                }}>
          <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px 0' }}>
                      📋 Preview
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                      {importLimit && parseInt(importLimit) > 0 ? (
                        <>
                          {mappedRows.length} of {rawRows.length} rows will be imported
                          {mappedRows.length < rawRows.length && (
                            <span style={{ color: 'var(--color-primary)', marginLeft: 4 }}>
                              (limited to first {importLimit})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {mappedRows.length} rows will be imported
                        </>
                      )}
                    </p>
                  </div>
                  {mappedRows.length > 50 && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Showing first 50 rows
                    </span>
                  )}
                </div>
                <div style={{ 
                  maxHeight: 300, 
                  overflow: 'auto', 
                  border: '1px solid var(--elev-border)', 
                  borderRadius: 8,
                  background: 'var(--color-surface)'
                }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--elev-bg)', zIndex: 10 }}>
                      <tr>
                        {Object.keys(mappedRows[0] || {}).map((h) => (
                          <th 
                            key={h} 
                            style={{ 
                              textAlign:'left', 
                              padding:'10px 12px', 
                              borderBottom:'2px solid var(--elev-border)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              background: 'var(--elev-bg)'
                            }}
                          >
                            {h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                      {mappedRows.slice(0, 50).map((r, idx) => (
                        <tr 
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'
                          }}
                        >
                          {Object.keys(mappedRows[0] || {}).map((h) => (
                            <td 
                              key={h} 
                              style={{ 
                                padding:'10px 12px', 
                                borderBottom:'1px solid var(--elev-border)',
                                fontSize: 12,
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={r[h] || ''}
                            >
                              {r[h] || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                            </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        {rawRows.length > 0 && showMapping && (
          <div style={{ 
            display:'flex', 
            flexDirection: 'column',
            gap: 12,
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid var(--elev-border)',
            flexShrink: 0
          }}>
            {/* Import Limit Section */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: '12px',
              background: 'rgba(124, 58, 237, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(124, 58, 237, 0.2)'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: 'var(--color-text)', 
                  marginBottom: 6 
                }}>
                  Import Limit (Optional)
                </label>
                <p style={{ 
                  fontSize: 11, 
                  color: 'var(--color-text-muted)', 
                  margin: 0 
                }}>
                  Import only the first N leads (leave empty to import all {rawRows.length} leads)
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  max={rawRows.length || 999999}
                  value={importLimit}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or valid number within range
                    if (value === '') {
                      setImportLimit('');
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue > 0 && numValue <= rawRows.length) {
                        setImportLimit(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur - clear if invalid
                    const value = e.target.value;
                    if (value !== '') {
                      const numValue = parseInt(value);
                      if (isNaN(numValue) || numValue <= 0 || numValue > rawRows.length) {
                        setImportLimit('');
                      }
                    }
                  }}
                  placeholder="All"
                  style={{
                    width: '100px',
                    padding: '8px 12px',
                    fontSize: 14,
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)'
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  leads
                </span>
              </div>
            </div>

            {/* Summary and Actions */}
            <div style={{ 
              display:'flex', 
              justifyContent:'space-between', 
              alignItems: 'center',
              gap:12
            }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {importLimit && parseInt(importLimit) > 0 ? (
                  <>
                    Ready to import <strong>{mappedRows.length}</strong> of <strong>{rawRows.length}</strong> {rawRows.length === 1 ? 'lead' : 'leads'}
                  </>
                ) : (
                  <>
                    Ready to import <strong>{mappedRows.length}</strong> {mappedRows.length === 1 ? 'lead' : 'leads'}
                  </>
                )}
              </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn-ghost" 
                onClick={()=>{ 
                  setRawRows([]); 
                  setHeaders([]); 
                  setFieldMapping({}); 
                  setFileName(""); 
                  setError(""); 
                  setShowMapping(false);
                  setImportLimit(""); 
                }}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                Clear
              </button>
              <button 
                className="btn-primary" 
                onClick={()=>{ 
                  onImported(mappedRows); 
                }}
                disabled={importProgress?.isImporting}
                style={{ 
                  padding: '10px 24px', 
                  fontSize: 14,
                  fontWeight: 600,
                  background: importProgress?.isImporting
                    ? 'var(--color-surface-secondary)' 
                    : 'var(--color-primary)',
                  opacity: importProgress?.isImporting ? 0.6 : 1,
                  cursor: importProgress?.isImporting ? 'not-allowed' : 'pointer'
                }}
              >
                {importProgress?.isImporting ? (
                  <>⏳ Importing...</>
                ) : (
                  <>✓ Import {mappedRows.length} {mappedRows.length === 1 ? 'Lead' : 'Leads'}</>
                )}
              </button>
            </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
