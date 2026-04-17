"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";

interface EmailEvent {
  id: number;
  type: string;
  meta?: {
    provider_id?: string;
    email?: string;
    timestamp?: number;
    url?: string;
    useragent?: string;
    reason?: string;
    subject?: string;
    bounce_type?: string;
    ip?: string;
  };
  createdAt: string;
}

interface EmailActivityTimelineProps {
  campaignId: number;
  leadId?: number;
  leadEmail?: string;
}

export function EmailActivityTimeline({ campaignId, leadId, leadEmail }: EmailActivityTimelineProps) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ campaign_id: campaignId.toString() });
        if (leadId) params.append("lead_id", leadId.toString());

        const data = await apiRequest(`/analytics/events?${params}`);
        // Filter for email-related events
        const emailEvents = (data.events || [])
          .filter((e: EmailEvent) =>
            ["sent", "processed", "delivered", "opened", "clicked", "bounced", "dropped", "deferred", "spam_report", "unsubscribe", "replied"].includes(
              e.type
            )
          )
          .sort((a: EmailEvent, b: EmailEvent) => {
            // Sort by timestamp if available, otherwise by createdAt
            const timeA = a.meta?.timestamp ? a.meta.timestamp * 1000 : new Date(a.createdAt).getTime();
            const timeB = b.meta?.timestamp ? b.meta.timestamp * 1000 : new Date(b.createdAt).getTime();
            return timeA - timeB;
          });

        setEvents(emailEvents);
      } catch (err: any) {
        console.error("Failed to fetch events:", err);
        setError(err?.message || "Failed to load email activity");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // Poll for updates every 10 seconds if campaign is active
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [campaignId, leadId]);

  const getEventConfig = (type: string) => {
    const configs: Record<
      string,
      { icon: React.ReactNode; label: string; color: string; bgColor: string }
    > = {
      sent: {
        icon: <Icons.Send size={16} />,
        label: "Email Sent",
        color: "#2563EB",
        bgColor: "rgba(37, 99, 235, 0.1)",
      },
      processed: {
        icon: <Icons.Loader size={16} />,
        label: "Processing",
        color: "#ffa726",
        bgColor: "rgba(255, 167, 38, 0.1)",
      },
      delivered: {
        icon: <Icons.Check size={16} />,
        label: "Delivered",
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.1)",
      },
      opened: {
        icon: <Icons.Mail size={16} />,
        label: "Opened",
        color: "#2563EB",
        bgColor: "rgba(37, 99, 235, 0.1)",
      },
      clicked: {
        icon: <Icons.ExternalLink size={16} />,
        label: "Link Clicked",
        color: "#06B6D4",
        bgColor: "rgba(6, 182, 212, 0.1)",
      },
      bounced: {
        icon: <Icons.AlertCircle size={16} />,
        label: "Bounced",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
      },
      dropped: {
        icon: <Icons.AlertCircle size={16} />,
        label: "Dropped",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
      },
      deferred: {
        icon: <Icons.Clock size={16} />,
        label: "Deferred",
        color: "#ffa726",
        bgColor: "rgba(255, 167, 38, 0.1)",
      },
      spam_report: {
        icon: <Icons.AlertCircle size={16} />,
        label: "Marked as Spam",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
      },
      unsubscribe: {
        icon: <Icons.AlertCircle size={16} />,
        label: "Unsubscribed",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
      },
      replied: {
        icon: <Icons.MessageCircle size={16} />,
        label: "Replied",
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.1)",
      },
    };

    return (
      configs[type] || {
        icon: <Icons.Circle size={16} />,
        label: type,
        color: "var(--color-text-muted)",
        bgColor: "rgba(128, 128, 128, 0.1)",
      }
    );
  };

  const formatTimestamp = (event: EmailEvent) => {
    if (event.meta?.timestamp) {
      return new Date(event.meta.timestamp * 1000).toLocaleString();
    }
    return new Date(event.createdAt).toLocaleString();
  };

  if (loading && events.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          color: "var(--color-text-muted)",
        }}
      >
        <Icons.Loader size={24} style={{ animation: "spin 1s linear infinite", marginRight: 12 }} />
        Loading email activity...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
          background: "rgba(239, 68, 68, 0.1)",
          borderRadius: 8,
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icons.AlertCircle size={20} />
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--color-text-muted)",
        }}
      >
        <Icons.Mail size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <div style={{ fontSize: 14 }}>No email activity yet</div>
        {leadEmail && (
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Waiting for events from {leadEmail}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
        {events.length} event{events.length !== 1 ? "s" : ""} • Updates every 10 seconds
      </div>
      {events.map((event, index) => {
        const config = getEventConfig(event.type);
        const isLast = index === events.length - 1;

        return (
          <div
            key={event.id}
            style={{
              display: "flex",
              gap: 16,
              padding: "16px",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              background: "var(--color-surface-secondary)",
              position: "relative",
            }}
          >
            {/* Timeline connector */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  left: "28px",
                  top: "48px",
                  width: "2px",
                  height: "calc(100% + 12px)",
                  background: "var(--color-border)",
                }}
              />
            )}

            {/* Icon */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: config.bgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.color,
                flexShrink: 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              {config.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{config.label}</div>
                {event.meta?.bounce_type && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      textTransform: "uppercase",
                    }}
                  >
                    {event.meta.bounce_type}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
                {formatTimestamp(event)}
              </div>

              {/* Additional details */}
              {event.meta?.url && (
                <div
                  style={{
                    fontSize: 12,
                    padding: "8px",
                    background: "var(--color-surface)",
                    borderRadius: 6,
                    marginTop: 8,
                    wordBreak: "break-all",
                  }}
                >
                  <strong>URL:</strong> {event.meta.url}
                </div>
              )}

              {event.meta?.reason && (
                <div
                  style={{
                    fontSize: 12,
                    padding: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: 6,
                    marginTop: 8,
                    color: "#ef4444",
                  }}
                >
                  <strong>Reason:</strong> {event.meta.reason}
                </div>
              )}

              {event.meta?.useragent && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {event.meta.useragent}
                </div>
              )}

              {event.meta?.ip && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                  IP: {event.meta.ip}
                </div>
              )}

              {event.meta?.subject && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, fontStyle: "italic" }}>
                  Subject: {event.meta.subject}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

