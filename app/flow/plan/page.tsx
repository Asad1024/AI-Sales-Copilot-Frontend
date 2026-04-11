"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptAIPlan, fetchPlanPreviewLeads, updateAIPlan } from "@/lib/flowClient";
import { useBase } from "@/context/BaseContext";
import { Icons } from "@/components/ui/Icons";

type SequenceStep = {
  day: number;
  channel: "email" | "whatsapp" | "call" | "linkedin" | "sms";
  objective: string;
  messaging_prompt?: string;
  follow_up_if?: string;
};

type CardType = "audience" | "lead" | "sequence" | "safety";

type ApolloFilterChip = {
  key: string;
  label: string;
  value: string[];
};

const leadTagStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: "999px",
  background: "rgba(124, 58, 237, 0.12)",
  border: "1px solid rgba(124, 58, 237, 0.2)",
  fontSize: "11px",
  color: "#7C3AED",
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
        console.error("Failed to preview Apollo leads:", error);
        setPreviewError(error?.message || "Failed to preview Apollo leads");
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
        setActiveBaseId(data.base_id);
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

  const apolloFilters = useMemo<ApolloFilterChip[]>(() => {
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

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', minHeight: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Review & edit plan
        </h1>
        <p style={{ 
          fontSize: '15px', 
          color: 'var(--color-text-muted)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Review and edit each section before starting your campaign
        </p>
        {plan.summary && (
          <p style={{ 
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            marginTop: '16px',
            maxWidth: '680px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {plan.summary}
          </p>
        )}
      </div>

      {/* Progress Indicator */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {cards.map((card, index) => (
          <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: index === currentCardIndex
                  ? 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)'
                  : index < currentCardIndex
                  ? 'rgba(124, 58, 237, 0.2)'
                  : 'var(--color-surface-secondary)',
                border: index === currentCardIndex
                  ? '2px solid transparent'
                  : '2px solid var(--elev-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '600',
                color: index === currentCardIndex ? '#000' : 'var(--color-text-muted)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => {
                setCurrentCard(card.id);
                setIsEditing(false);
              }}
            >
              {index < currentCardIndex ? (
                <Icons.Check size={20} />
              ) : card.icon === 'target' ? (
                <Icons.Target size={20} />
              ) : card.icon === 'chart' ? (
                <Icons.Chart size={20} />
              ) : card.icon === 'list' ? (
                <Icons.FileText size={20} />
              ) : (
                <Icons.Shield size={20} />
              )}
            </div>
            {index < cards.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                background: index < currentCardIndex
                  ? 'linear-gradient(90deg, #7C3AED 0%, #A94CFF 100%)'
                  : 'var(--elev-border)',
                transition: 'all 0.3s ease'
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Current Card */}
      <div style={{
        background: 'var(--elev-bg)',
        border: '1px solid var(--elev-border)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: 'var(--elev-shadow-lg)',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Gradient top border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #7C3AED 0%, #A94CFF 100%)'
        }} />

        {/* Card Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7C3AED'
            }}>
              {currentCardData.icon === 'target' ? (
                <Icons.Target size={28} />
              ) : currentCardData.icon === 'chart' ? (
                <Icons.Chart size={28} />
              ) : currentCardData.icon === 'list' ? (
                <Icons.FileText size={28} />
              ) : (
                <Icons.Shield size={28} />
              )}
            </div>
            <div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                margin: '0 0 4px 0',
                color: 'var(--color-text)'
              }}>
                {currentCardData.title}
              </h2>
              <span style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)',
                color: '#7C3AED',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: '1px solid rgba(124, 58, 237, 0.2)'
              }}>
                {currentCardData.badge}
              </span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-ghost"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          )}
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
                border: '1px solid rgba(124, 58, 237, 0.2)',
                background: 'rgba(124, 58, 237, 0.05)'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  margin: '0 0 12px 0',
                  color: 'var(--color-text)'
                }}>
                  Apollo Filters
                </h3>
                {apolloFilters.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                    No Apollo filters available for this plan.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {apolloFilters.map((filter) => (
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
                                background: 'rgba(124, 58, 237, 0.12)',
                                border: '1px solid rgba(124, 58, 237, 0.25)',
                                fontSize: '12px',
                                color: '#7C3AED',
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
                    Preview from Apollo • {previewLeads.length} shown
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className="btn-ghost"
          style={{
            padding: '16px 28px',
            fontSize: '15px',
            fontWeight: '600',
            opacity: currentCardIndex === 0 ? 0.5 : 1,
            cursor: currentCardIndex === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '14px',
            border: '1px solid var(--elev-border)',
            background: 'var(--color-surface-secondary)',
            color: 'var(--color-text)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            if (currentCardIndex !== 0) {
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
              e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--elev-border)';
            e.currentTarget.style.background = 'var(--color-surface-secondary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Previous
        </button>

        <div style={{ 
          fontSize: '13px', 
          color: 'var(--color-text-muted)',
          fontWeight: '500'
        }}>
          {currentCardIndex + 1} of {cards.length}
        </div>

        {currentCardIndex === cards.length - 1 ? (
          <button
            onClick={handleApprove}
            disabled={loading || saving}
            className="btn-primary"
            style={{
              padding: '16px 36px',
              fontSize: '15px',
              fontWeight: '700',
              minWidth: '200px',
              opacity: (loading || saving) ? 0.7 : 1,
              cursor: (loading || saving) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
              color: '#000',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!loading && !saving) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(124, 58, 237, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.3)';
            }}
          >
            {loading ? "Starting..." : saving ? "Saving..." : "Approve & Start"}
          </button>
        ) : (
          <button
            onClick={nextCard}
            disabled={isEditing}
            className="btn-primary"
            style={{
              padding: '16px 36px',
              fontSize: '15px',
              fontWeight: '700',
              minWidth: '200px',
              opacity: isEditing ? 0.5 : 1,
              cursor: isEditing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
              color: '#000',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!isEditing) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(124, 58, 237, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.3)';
            }}
          >
            Next
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
                  background: isEditing ? 'rgba(124, 58, 237, 0.05)' : 'var(--color-surface-secondary)',
                  borderRadius: '12px',
                  border: isEditing 
                    ? '2px solid rgba(124, 58, 237, 0.3)' 
                    : '1px solid var(--elev-border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
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
                            border: '1px solid rgba(124, 58, 237, 0.3)',
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
                          border: '1px solid rgba(124, 58, 237, 0.3)',
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
                  color: '#7C3AED',
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px dashed rgba(124, 58, 237, 0.4)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
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
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(169, 76, 255, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#7C3AED',
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
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(169, 76, 255, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: '#7C3AED',
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
