"use client";

import { CSSProperties, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { acceptAIPlan, fetchPlanPreviewLeads, updateAIPlan } from "@/lib/flowClient";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { Icons } from "@/components/ui/Icons";

const ACCENT = "#4f46e5";
const ACCENT_MID = "#6366f1";
const SLATE_200 = "#e2e8f0";
const SLATE_500 = "#64748b";
const SLATE_700 = "#334155";
const EMERALD = "#059669";

type SequenceStep = {
  day: number;
  channel: "email" | "whatsapp" | "call" | "linkedin" | "sms";
  objective: string;
  messaging_prompt?: string;
  follow_up_if?: string;
};

type CardType = "audience" | "lead" | "sequence" | "safety";

type LeadFilterChip = {
  key: string;
  label: string;
  value: string[];
};

const leadTagStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: "999px",
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
  fontSize: "11px",
  color: ACCENT,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px"
};

export default function PlanPage() {
  const router = useRouter();
  const { setActiveBaseId, refreshBases } = useBase();
  const [planId, setPlanId] = useState<string>("");
  const [plan, setPlan] = useState<any>(null);
  const [originalPlan, setOriginalPlan] = useState<any>(null);
  const [currentCard, setCurrentCard] = useState<CardType>("audience");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);

  const cards: { id: CardType; title: string; badge: string; icon: string }[] = [
    { id: "audience", title: "Audience", badge: "Target", icon: "target" },
    { id: "lead", title: "Lead sources", badge: "Data", icon: "chart" },
    { id: "sequence", title: "Sequence", badge: "Omni", icon: "list" },
    { id: "safety", title: "Safety", badge: "On", icon: "shield" },
  ];

  useEffect(() => {
    const saved = sessionStorage.getItem("sparkai:plan");
    if (!saved) {
      router.push("/flow/new-goal");
      return;
    }
    try {
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        setPlanId(parsed.plan_id);
        setPlan(parsed.plan);
        setOriginalPlan(parsed.plan);
      }
    } catch (error) {
      console.error('Error parsing currentPlan:', error);
      localStorage.removeItem('sparkai:currentPlan');
    }
  }, [router]);

  useEffect(() => {
    async function loadPreview() {
      if (!planId) return;
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await fetchPlanPreviewLeads(planId, 15);
        setPreviewLeads(Array.isArray(data?.leads) ? data.leads : []);
      } catch (error: any) {
        console.error("Failed to preview leads:", error);
        setPreviewError(error?.message || "Failed to preview leads");
      } finally {
        setPreviewLoading(false);
      }
    }
    if (plan?.apollo_filters) {
      loadPreview();
    }
  }, [planId, plan?.apollo_filters]);

  async function handleApprove() {
    if (!planId) return;
    setLoading(true);
    try {
      const data = await acceptAIPlan(planId);
      sessionStorage.setItem("sparkai:run", JSON.stringify(data));
      sessionStorage.removeItem("sparkai:plan");
      await refreshBases();
      if (data?.base_id) {
        const b = useBaseStore.getState().bases.find((x) => x.id === data.base_id);
        setActiveBaseId(data.base_id, b ? { name: b.name } : undefined);
      }
      router.push("/bases");
    } catch (error) {
      console.error("Failed to accept plan:", error);
    } finally {
      setLoading(false);
    }
  }

  async function persistEdits(nextPlan: any) {
    if (!planId) return;
    setSaving(true);
    setPlan(nextPlan);
    await updateAIPlan({
      plan_id: planId,
      audience: nextPlan.audience,
      lead_sources: nextPlan.lead_sources,
      sequence: nextPlan.sequence,
      safety: nextPlan.safety,
    });
    sessionStorage.setItem(
      "sparkai:plan",
      JSON.stringify({ plan_id: planId, plan: nextPlan })
    );
    setSaving(false);
  }

  function nextCard() {
    const currentIndex = cards.findIndex(c => c.id === currentCard);
    if (currentIndex < cards.length - 1) {
      setCurrentCard(cards[currentIndex + 1].id);
      setIsEditing(false);
    }
  }

  function prevCard() {
    const currentIndex = cards.findIndex(c => c.id === currentCard);
    if (currentIndex > 0) {
      setCurrentCard(cards[currentIndex - 1].id);
      setIsEditing(false);
    }
  }

  const leadFilters = useMemo<LeadFilterChip[]>(() => {
    if (!plan?.apollo_filters) return [];
    return Object.entries(plan.apollo_filters)
      .filter(([, value]) => Array.isArray(value) && value.length > 0)
      .map(([key, value]) => {
        const values = Array.isArray(value)
          ? (value as unknown[]).map((entry) => String(entry))
          : [];
        return {
          key,
          label: key.replace(/_/g, " "),
          value: values
        };
      });
  }, [plan?.apollo_filters]);

  if (!plan) return null;

  const currentCardIndex = cards.findIndex(c => c.id === currentCard);
  const currentCardData = cards[currentCardIndex];

  const stepIcon = (card: (typeof cards)[0], index: number) => {
    const done = index < currentCardIndex;
    const active = index === currentCardIndex;
    const c = done || active ? "#ffffff" : SLATE_500;
    const s = { color: c } as CSSProperties;
    if (done) return <Icons.Check size={20} strokeWidth={2.5} style={s} />;
    if (card.icon === "target") return <Icons.Target size={20} strokeWidth={1.75} style={s} />;
    if (card.icon === "chart") return <Icons.Chart size={20} strokeWidth={1.75} style={s} />;
    if (card.icon === "list") return <Icons.FileText size={20} strokeWidth={1.75} style={s} />;
    return <Icons.Shield size={20} strokeWidth={1.75} style={s} />;
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(16px, 3vw, 28px)",
        minHeight: "calc(100vh - 100px)",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      <header style={{ marginBottom: 28, textAlign: "left" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 11px",
            borderRadius: 9999,
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", letterSpacing: "0.06em" }}>4 STEPS</span>
        </div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3vw, 1.75rem)",
            fontWeight: 800,
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
            color: "var(--color-text, #0f172a)",
          }}
        >
          Review &amp; edit plan
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted, #64748b)", margin: 0, lineHeight: 1.55, maxWidth: 560 }}>
          Review and edit each section before starting your campaign.
        </p>
        {plan.summary ? (
          <p
            style={{
              fontSize: 14,
              color: SLATE_500,
              marginTop: 14,
              marginBottom: 0,
              lineHeight: 1.55,
              padding: "12px 14px",
              background: "#f8fafc",
              borderRadius: 10,
              border: `1px solid ${SLATE_200}`,
            }}
          >
            {plan.summary}
          </p>
        ) : null}
      </header>

      {/* Step indicator — compact, labeled */}
      <nav aria-label="Plan sections" style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: 640,
            margin: "0 auto",
            gap: 0,
          }}
        >
          {cards.map((card, index) => {
            const done = index < currentCardIndex;
            const active = index === currentCardIndex;
            const ring = active ? `0 0 0 3px rgba(99, 102, 241, 0.35)` : "none";
            const bg = done
              ? EMERALD
              : active
                ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_MID} 100%)`
                : "#f8fafc";
            const border = done || active ? "2px solid transparent" : `2px solid ${SLATE_200}`;
            return (
              <Fragment key={card.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCard(card.id);
                    setIsEditing(false);
                  }}
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 6px",
                    margin: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    minWidth: 72,
                  }}
                >
                  <span
                    aria-current={active ? "step" : undefined}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: bg,
                      border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: ring,
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {stepIcon(card, index)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 700 : 600,
                      color: active ? ACCENT : done ? SLATE_700 : SLATE_500,
                      letterSpacing: "-0.01em",
                      textAlign: "center",
                      lineHeight: 1.2,
                      maxWidth: 88,
                    }}
                  >
                    {card.title}
                  </span>
                </button>
                {index < cards.length - 1 ? (
                  <div
                    aria-hidden
                    style={{
                      flex: "1 1 12px",
                      height: 3,
                      minWidth: 8,
                      maxWidth: 48,
                      alignSelf: "flex-start",
                      marginTop: 24,
                      borderRadius: 2,
                      background: index < currentCardIndex ? `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_MID} 100%)` : SLATE_200,
                      transition: "background 0.2s ease",
                    }}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </nav>

      {/* Current Card */}
      <div
        style={{
          background: "var(--elev-bg, #ffffff)",
          border: `1px solid ${SLATE_200}`,
          borderRadius: 16,
          padding: "clamp(20px, 4vw, 32px)",
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_MID} 100%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            position: "relative",
            zIndex: 1,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: ACCENT,
                flexShrink: 0,
              }}
            >
              {currentCardData.icon === "target" ? (
                <Icons.Target size={26} />
              ) : currentCardData.icon === "chart" ? (
                <Icons.Chart size={26} />
              ) : currentCardData.icon === "list" ? (
                <Icons.FileText size={26} />
              ) : (
                <Icons.Shield size={26} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)",
                  fontWeight: 700,
                  margin: "0 0 6px 0",
                  color: "var(--color-text, #0f172a)",
                  letterSpacing: "-0.02em",
                }}
              >
                {currentCardData.title}
              </h2>
              <span
                style={{
                  display: "inline-block",
                  background: "#eef2ff",
                  color: ACCENT,
                  padding: "3px 10px",
                  borderRadius: 9999,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  border: "1px solid #e0e7ff",
                }}
              >
                {currentCardData.badge}
              </span>
            </div>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                border: `1px solid ${SLATE_200}`,
                background: "#fff",
                color: SLATE_700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
            >
              <Pencil size={16} strokeWidth={2} aria-hidden />
              Edit
            </button>
          ) : null}
        </div>

        {/* Card Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {currentCard === "audience" && (
            <CardContent
              isEditing={isEditing}
              items={plan.audience || []}
              onSave={async (items) => {
                const next = { ...plan, audience: items };
                await persistEdits(next);
                setIsEditing(false);
              }}
              onCancel={() => {
                setIsEditing(false);
              }}
              placeholder="Enter audience details, one per line..."
            />
          )}

          {currentCard === "lead" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <CardContent
                isEditing={isEditing}
                items={plan.lead_sources || []}
                onSave={async (items) => {
                  const next = { ...plan, lead_sources: items };
                  await persistEdits(next);
                  setIsEditing(false);
                }}
                onCancel={() => {
                  setIsEditing(false);
                }}
                placeholder="Enter lead sources, one per line..."
              />

              <div style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                background: 'rgba(37, 99, 235, 0.05)'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  margin: '0 0 12px 0',
                  color: 'var(--color-text)'
                }}>
                  Lead filters
                </h3>
                {leadFilters.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                    No lead filters saved for this plan.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {leadFilters.map((filter) => (
                      <div key={filter.key}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          {filter.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {filter.value.map((item: string, idx: number) => (
                            <span
                              key={`${filter.key}-${idx}`}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '999px',
                                background: 'rgba(37, 99, 235, 0.12)',
                                border: '1px solid rgba(37, 99, 235, 0.25)',
                                fontSize: '12px',
                                color: '#2563EB',
                                fontWeight: 600
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--elev-border)',
                background: 'var(--color-surface-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    margin: 0,
                    color: 'var(--color-text)'
                  }}>
                    Sample Leads
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)'
                  }}>
                    Preview • {previewLeads.length} shown
                  </span>
                </div>

                {previewLoading ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                    Loading preview leads…
                  </p>
                ) : previewError ? (
                  <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0 }}>
                    {previewError}
                  </p>
                ) : previewLeads.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                    No leads preview available. Adjust filters or try again later.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                    {previewLeads.map((lead) => {
                      const regionParts = [lead.city, lead.state, lead.country].filter(Boolean);
                      const locationLabel = regionParts.join(", ");
                      const sizeLabel = lead.organization?.size;
                      return (
                        <div
                          key={lead.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--elev-border)',
                            background: 'var(--elev-bg)'
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>
                            {lead.first_name || lead.last_name ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() : lead.name || "Unknown contact"}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {lead.title || "Title unknown"} @ {lead.organization?.name || "Unknown org"}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {lead.email && (
                              <span style={leadTagStyle}>
                                {lead.email}
                              </span>
                            )}
                            {lead.organization?.industry && (
                              <span style={leadTagStyle}>🏢 {lead.organization.industry}</span>
                            )}
                            {sizeLabel && (
                              <span style={leadTagStyle}>👥 {sizeLabel}</span>
                            )}
                            {locationLabel && (
                              <span style={leadTagStyle}>📍 {locationLabel}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentCard === "sequence" && (
            <SequenceCardContent
              isEditing={isEditing}
              sequence={plan.sequence || []}
              originalSequence={originalPlan?.sequence || []}
              onSave={async (sequence) => {
                const next = { ...plan, sequence };
                await persistEdits(next);
                setIsEditing(false);
              }}
              onCancel={() => {
                setIsEditing(false);
              }}
            />
          )}

          {currentCard === "safety" && (
            <CardContent
              isEditing={isEditing}
              items={plan.safety || []}
              onSave={async (items) => {
                const next = { ...plan, safety: items };
                await persistEdits(next);
                setIsEditing(false);
              }}
              onCancel={() => {
                setIsEditing(false);
              }}
              placeholder="Enter safety rules, one per line..."
              hint="Examples: cap: 200/day • quiet hours: 20:00–09:00 • stop on reply"
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          paddingTop: 4,
        }}
      >
        <button
          type="button"
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          style={{
            padding: "12px 18px",
            fontSize: 14,
            fontWeight: 600,
            opacity: currentCardIndex === 0 ? 0.45 : 1,
            cursor: currentCardIndex === 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 10,
            border: `1px solid ${SLATE_200}`,
            background: "#fff",
            color: SLATE_700,
            fontFamily: "inherit",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          Previous
        </button>

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: SLATE_500,
            letterSpacing: "0.04em",
            padding: "6px 12px",
            borderRadius: 9999,
            background: "#f8fafc",
            border: `1px solid ${SLATE_200}`,
          }}
        >
          {currentCardIndex + 1} of {cards.length}
        </div>

        {currentCardIndex === cards.length - 1 ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading || saving}
            style={{
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              minWidth: 168,
              opacity: loading || saving ? 0.65 : 1,
              cursor: loading || saving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_MID} 100%)`,
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(79, 70, 229, 0.35)",
              fontFamily: "inherit",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
            }}
          >
            {loading ? "Starting…" : saving ? "Saving…" : "Approve & start"}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextCard}
            disabled={isEditing}
            style={{
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              minWidth: 168,
              opacity: isEditing ? 0.45 : 1,
              cursor: isEditing ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_MID} 100%)`,
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(79, 70, 229, 0.35)",
              fontFamily: "inherit",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
            }}
          >
            Next
            <ChevronRight size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function CardContent({
  isEditing,
  items,
  onSave,
  onCancel,
  placeholder,
  hint
}: {
  isEditing: boolean;
  items: string[];
  onSave: (items: string[]) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  hint?: string;
}) {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items, isEditing]);

  // Parse item to extract label and value if it contains a colon
  const parseItem = (item: string) => {
    if (item.includes(':')) {
      const [label, ...valueParts] = item.split(':');
      return {
        label: label.trim(),
        value: valueParts.join(':').trim()
      };
    }
    return { label: null, value: item };
  };

  const handleItemChange = (index: number, newValue: string) => {
    const updated = [...localItems];
    updated[index] = newValue;
    setLocalItems(updated);
  };

  const handleAddItem = () => {
    setLocalItems([...localItems, '']);
    setEditingIndex(localItems.length);
  };

  const handleDeleteItem = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    const filtered = localItems.map(l => l.trim()).filter(Boolean);
    await onSave(filtered);
    setSaving(false);
  };

  return (
    <div>
      {localItems.length === 0 && !isEditing ? (
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
          margin: 0,
          padding: '20px',
          textAlign: 'center'
        }}>
          No items configured
        </p>
      ) : (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {localItems.map((item, i) => {
            const { label, value } = parseItem(item);
            const isItemEditing = isEditing && editingIndex === i;
            
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px 20px',
                  background: isEditing ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-surface-secondary)',
                  borderRadius: '12px',
                  border: isEditing 
                    ? '2px solid rgba(37, 99, 235, 0.3)' 
                    : '1px solid var(--elev-border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {label ? (
                      <>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          {label}:
                        </div>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            // Reconstruct item with label prefix
                            handleItemChange(i, `${label}: ${e.target.value}`);
                          }}
                          onFocus={() => setEditingIndex(i)}
                          className="input"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '15px',
                            fontWeight: '500',
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                            background: 'var(--elev-bg)'
                          }}
                          placeholder="Enter value..."
                          autoFocus={editingIndex === i}
                        />
                      </>
                    ) : (
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleItemChange(i, e.target.value)}
                        onFocus={() => setEditingIndex(i)}
                        className="input"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '14px',
                          fontWeight: '500',
                          border: '1px solid rgba(37, 99, 235, 0.3)',
                          background: 'var(--elev-bg)'
                        }}
                        placeholder={placeholder || "Enter item..."}
                        autoFocus={editingIndex === i}
                      />
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(i)}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#ff6b6b',
                          background: 'rgba(255, 107, 107, 0.1)',
                          border: '1px solid rgba(255, 107, 107, 0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {label ? (
                      <>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {label}
                        </div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '500',
                          color: 'var(--color-text)',
                          lineHeight: 1.5
                        }}>
                          {value}
                        </div>
                      </>
                    ) : (
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: 'var(--color-text)',
                        lineHeight: 1.6
                      }}>
                        {value}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2563EB',
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px dashed rgba(37, 99, 235, 0.4)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)';
                }}
              >
                <span>+</span>
                <span>Add Item</span>
              </button>
              
              {hint && (
                <p style={{ 
                  fontSize: '12px', 
                  color: 'var(--color-text-muted)',
                  margin: 0,
                  lineHeight: 1.5,
                  fontStyle: 'italic'
                }}>
                  {hint}
                </p>
              )}
              
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--elev-border)' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-ghost"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SequenceCardContent({
  isEditing,
  sequence,
  originalSequence,
  onSave,
  onCancel
}: {
  isEditing: boolean;
  sequence: SequenceStep[];
  originalSequence: SequenceStep[];
  onSave: (sequence: SequenceStep[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState<SequenceStep[]>(sequence);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(sequence);
  }, [sequence, isEditing]);

  function updateStep(idx: number, field: keyof SequenceStep, value: any) {
    const copy = [...local];
    (copy[idx] as any)[field] = value;
    setLocal(copy);
  }

  function addStep() {
    setLocal((prev) => [...prev, { day: 0, channel: "email", objective: "follow up" }]);
  }

  function removeStep(idx: number) {
    setLocal((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const next = [...local];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setLocal(next);
  }

  if (!isEditing) {
    return (
      <div>
        {local.length === 0 ? (
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            margin: 0
          }}>
            No sequence steps configured
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {local.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  background: 'var(--color-surface-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--elev-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#2563EB',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>
                    Day {step.day}: {step.channel === 'email'
                      ? '📧'
                      : step.channel === 'whatsapp'
                      ? '💬'
                      : step.channel === 'call'
                      ? '📞'
                      : step.channel === 'sms'
                      ? '📱'
                      : '💼'} {step.channel}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {step.objective}
                  </div>
                  {step.messaging_prompt && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      <strong>Prompt:</strong> {step.messaging_prompt}
                    </div>
                  )}
                  {step.follow_up_if && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <strong>If:</strong> {step.follow_up_if}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(local);
        setSaving(false);
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '8px'
      }}>
        {local.map((step, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid var(--elev-border)',
              borderRadius: '12px',
              padding: '16px',
              background: 'var(--color-surface-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: '#2563EB',
                flexShrink: 0
              }}>
                {idx + 1}
              </div>
              <input
                type="number"
                value={step.day}
                onChange={(e) => updateStep(idx, "day", Number(e.target.value))}
                className="input"
                style={{
                  width: '70px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
                min="0"
              />
              <span style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap'
              }}>
                days
              </span>
              <select
                value={step.channel}
                onChange={(e) => updateStep(idx, "channel", e.target.value as any)}
                className="input"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px'
                }}
              >
                <option value="email">📧 Email</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="call">📞 Call</option>
                <option value="linkedin">💼 LinkedIn</option>
                <option value="sms">📱 SMS</option>
              </select>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    minWidth: 'auto'
                  }}
                  onClick={() => moveStep(idx, -1)}
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    minWidth: 'auto'
                  }}
                  onClick={() => moveStep(idx, 1)}
                  disabled={idx === local.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    minWidth: 'auto',
                    color: '#ff6b6b'
                  }}
                  onClick={() => removeStep(idx)}
                >
                  ✕
                </button>
              </div>
            </div>
            <input
              value={step.objective}
              onChange={(e) => updateStep(idx, "objective", e.target.value)}
              className="input"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '8px'
              }}
              placeholder="Objective (e.g., value-first intro, case study, book meeting)"
            />
            <textarea
              value={step.messaging_prompt ?? ""}
              onChange={(e) => updateStep(idx, "messaging_prompt", e.target.value || undefined)}
              className="input"
              style={{
                width: '100%',
                minHeight: '70px',
                padding: '10px 14px',
                fontSize: '12px',
                marginBottom: '6px'
              }}
              placeholder="Optional messaging prompt the AI should follow for this step"
            />
            <input
              value={step.follow_up_if ?? ""}
              onChange={(e) => updateStep(idx, "follow_up_if", e.target.value || undefined)}
              className="input"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '12px'
              }}
              placeholder="Optional condition (e.g., follow up if no reply after 2 days)"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStep}
        className="btn-ghost"
        style={{
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: '500',
          alignSelf: 'flex-start'
        }}
      >
        + Add step
      </button>

      <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--elev-border)' }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
          style={{
            padding: '12px 24px',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
