"use client";
import { useState, useEffect } from "react";
import { useNotification } from "@/context/NotificationContext";

interface LeadReply {
  id: number;
  name: string;
  company: string;
  email: string;
  channel: string;
  message: string;
  time: string;
  score: number;
  status: string;
  timeline: Array<{ action: string; time: string; type: string; channel: string }>;
  aiSuggestions: string[];
}

export default function DemoInboxPage() {
  const { showInfo } = useNotification();
  const [selectedLead, setSelectedLead] = useState<LeadReply | null>(null);
  const [replies, setReplies] = useState([
    {
      id: 1,
      name: "Ahmed Al-Rashid",
      company: "Dubai Properties",
      email: "ahmed@dubaiproperties.ae",
      channel: "email",
      message: "Hi, I'm interested in learning more about your solution. Can we schedule a call this week?",
      time: "2 minutes ago",
      score: 95,
      status: "Hot",
      timeline: [
        { action: "Email opened", time: "2 min ago", type: "open", channel: "email" },
        { action: "Link clicked", time: "1 min ago", type: "click", channel: "email" },
        { action: "Replied", time: "Just now", type: "reply", channel: "email" }
      ],
      aiSuggestions: [
        "Thanks for your interest! I'd be happy to schedule a call. How does Tuesday at 2 PM work for you?",
        "Great to hear from you! I have some exciting insights about how we've helped similar real estate companies increase their lead conversion by 40%. Would you like to see a quick demo?",
        "Perfect timing! I have a 15-minute slot available tomorrow. Here's my calendar link: [booking link]"
      ]
    },
    {
      id: 2,
      name: "Sarah Johnson",
      company: "Abu Dhabi Realty",
      email: "sarah@abudhabirealty.com",
      channel: "whatsapp",
      message: "Can we schedule a call for tomorrow? I'm very interested in your automation platform.",
      time: "5 minutes ago",
      score: 87,
      status: "Warm",
      timeline: [
        { action: "WhatsApp delivered", time: "5 min ago", type: "delivered", channel: "whatsapp" },
        { action: "WhatsApp read", time: "3 min ago", type: "read", channel: "whatsapp" },
        { action: "Replied", time: "2 min ago", type: "reply", channel: "whatsapp" }
      ],
      aiSuggestions: [
        "Absolutely! I have availability tomorrow. What time works best for you?",
        "I'd love to show you our platform! I have a 30-minute demo slot available tomorrow at 10 AM or 3 PM. Which works better?",
        "Perfect! Here's my calendar: [booking link] - feel free to pick any slot that works for you."
      ]
    },
    {
      id: 3,
      name: "Mohammed Hassan",
      company: "Emirates Real Estate",
      email: "mohammed@emiratesre.ae",
      channel: "email",
      message: "I'm not interested right now, but maybe in the future. Please remove me from your list.",
      time: "12 minutes ago",
      score: 23,
      status: "Cold",
      timeline: [
        { action: "Email opened", time: "12 min ago", type: "open", channel: "email" },
        { action: "Replied", time: "10 min ago", type: "reply", channel: "email" }
      ],
      aiSuggestions: [
        "No problem at all! I've removed you from our list. Thanks for letting me know.",
        "Understood! I'll make sure you don't receive any more emails from us. Best of luck with your business!",
        "Of course! You're all set. If you ever change your mind, feel free to reach out. Have a great day!"
      ]
    },
    {
      id: 4,
      name: "Fatima Al-Zahra",
      company: "Sharjah Properties",
      email: "fatima@sharjahprops.ae",
      channel: "linkedin",
      message: "This looks interesting. Can you send me more information about pricing?",
      time: "18 minutes ago",
      score: 78,
      status: "Warm",
      timeline: [
        { action: "LinkedIn message sent", time: "20 min ago", type: "sent", channel: "linkedin" },
        { action: "LinkedIn message read", time: "18 min ago", type: "read", channel: "linkedin" },
        { action: "Replied", time: "15 min ago", type: "reply", channel: "linkedin" }
      ],
      aiSuggestions: [
        "I'd be happy to share our pricing! Let me send you our pricing guide and schedule a quick call to discuss your specific needs.",
        "Great question! Our pricing depends on your team size and requirements. I have a detailed pricing sheet - would you like me to email it to you?",
        "Absolutely! I'll send you our pricing information right away. Would you also like to see a quick demo of how it works?"
      ]
    }
  ]);

  const [insights, setInsights] = useState([
    {
      title: "Reply rate is 11.4%, good.",
      type: "success",
      action: null
    },
    {
      title: "WhatsApp touch is working better for SMB — want to clone this for 120 more leads?",
      type: "suggestion",
      action: "Apply"
    },
    {
      title: "Subject B beat A by 13%, roll B?",
      type: "suggestion",
      action: "Yes"
    },
    {
      title: "Ahmed Al-Rashid has high buying intent - prioritize this lead",
      type: "priority",
      action: "Contact Now"
    }
  ]);

  const [stats, setStats] = useState({
    totalReplies: replies.length,
    replyRate: 11.4,
    avgResponseTime: "2.3 hours",
    hotLeads: replies.filter(r => r.status === 'Hot').length
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return '📧';
      case 'whatsapp': return '📱';
      case 'linkedin': return '💼';
      case 'sms': return '💬';
      default: return '📧';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return '#ff6b6b';
      case 'Warm': return '#ffa726';
      case 'Cold': return '#888';
      default: return '#888';
    }
  };

  const handleAISuggestion = (_leadId: number, suggestion: string) => {
    showInfo("Demo inbox", `Sending reply: "${suggestion}"`);
  };

  const handleInsightAction = (insight: { action?: string | null }) => {
    if (insight.action) {
      showInfo("Demo inbox", `Executing: ${insight.action}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--color-background)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
          borderRadius: '20px',
          padding: '32px',
          border: '1px solid rgba(76, 103, 255, 0.2)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: '0 0 8px 0',
                color: 'var(--color-text)'
              }}>
                🤖 Unified Inbox
              </h1>
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--color-text-muted)', 
                margin: 0 
              }}>
                All replies from Email + WhatsApp + LinkedIn in one place
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#4C67FF' }}>
                  {stats.totalReplies}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  new replies
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#A94CFF' }}>
                  {stats.replyRate}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  reply rate
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#4C67FF' }}>
                {stats.hotLeads}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Hot Leads
              </div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#A94CFF' }}>
                {stats.avgResponseTime}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Avg Response
              </div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#4ecdc4' }}>
                4
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Channels
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
          {/* Replies List */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              margin: '0 0 20px 0',
              color: 'var(--color-text)'
            }}>
              Recent Replies ({replies.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {replies.map((reply) => (
                <div 
                  key={reply.id}
                  onClick={() => setSelectedLead(reply)}
                  style={{
                    background: selectedLead?.id === reply.id 
                      ? 'rgba(76, 103, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.02)',
                    border: selectedLead?.id === reply.id 
                      ? '1px solid rgba(76, 103, 255, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '24px' }}>{getChannelIcon(reply.channel)}</div>
                      <div>
                        <h4 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          margin: '0 0 4px 0',
                          color: 'var(--color-text)'
                        }}>
                          {reply.name}
                        </h4>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--color-text-muted)', 
                          margin: 0 
                        }}>
                          {reply.company}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: getStatusColor(reply.status),
                        color: '#000000',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {reply.status}
                      </span>
                      <span style={{
                        background: 'rgba(76, 103, 255, 0.2)',
                        color: '#4C67FF',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {reply.score}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {reply.time}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                    lineHeight: '1.4'
                  }}>
                    "{reply.message}"
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4C67FF'
                    }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      AI has suggestions ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Details & AI Suggestions */}
          {selectedLead && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              height: 'fit-content'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  margin: '0 0 8px 0',
                  color: 'var(--color-text)'
                }}>
                  {selectedLead.name}
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--color-text-muted)', 
                  margin: '0 0 16px 0' 
                }}>
                  {selectedLead.company} • {selectedLead.email}
                </p>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <span style={{
                    background: getStatusColor(selectedLead.status),
                    color: '#000000',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {selectedLead.status}
                  </span>
                  <span style={{
                    background: 'rgba(76, 103, 255, 0.2)',
                    color: '#4C67FF',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Score: {selectedLead.score}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  color: 'var(--color-text)'
                }}>
                  Timeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedLead.timeline.map((event, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: event.type === 'reply' ? '#4C67FF' : '#A94CFF'
                      }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text)', flex: 1 }}>
                        {event.action}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {event.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Reply Suggestions */}
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  color: 'var(--color-text)'
                }}>
                  🤖 AI Reply Suggestions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedLead.aiSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleAISuggestion(selectedLead.id, suggestion)}
                      style={{
                        background: 'rgba(76, 103, 255, 0.1)',
                        border: '1px solid rgba(76, 103, 255, 0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'var(--color-text)',
                        fontSize: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights & Next Actions */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginTop: '24px'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            margin: '0 0 20px 0',
            color: 'var(--color-text)'
          }}>
            🧠 AI Insights & Next Actions
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {insights.map((insight, index) => (
              <div 
                key={index}
                style={{
                  background: insight.type === 'success' 
                    ? 'rgba(78, 205, 196, 0.1)'
                    : insight.type === 'suggestion'
                      ? 'rgba(76, 103, 255, 0.1)'
                      : 'rgba(255, 167, 38, 0.1)',
                  border: insight.type === 'success' 
                    ? '1px solid rgba(78, 205, 196, 0.3)'
                    : insight.type === 'suggestion'
                      ? '1px solid rgba(76, 103, 255, 0.3)'
                      : '1px solid rgba(255, 167, 38, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--color-text)', 
                  margin: 0,
                  flex: 1
                }}>
                  {insight.title}
                </p>
                {insight.action && (
                  <button
                    onClick={() => handleInsightAction(insight)}
                    style={{
                      background: insight.type === 'suggestion' 
                        ? 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)'
                        : 'rgba(255, 167, 38, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: insight.type === 'suggestion' ? '#000000' : '#ffa726',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {insight.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="card" style={{
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          marginTop: '24px'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-muted)', 
            margin: 0 
          }}>
            🎭 <strong>Demo Mode:</strong> This unified inbox shows how AI would manage all your replies in one place. 
            In production, this would integrate with your actual email, WhatsApp, and LinkedIn accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
