"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const data = await apiRequest('/templates');
        setTemplates(data.templates || []);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof templates[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'linkedin' | 'whatsapp' | 'sms',
    subject: '',
    content: '',
    category: 'Outreach'
  });

  const categories = ["All", "Outreach", "Follow-up", "Social", "Meeting", "Proposal"];

  const filteredTemplates = selectedCategory === "All" 
    ? templates 
    : templates.filter(t => {
        const templateCategory = (t.variables as any)?.category || 'Outreach';
        return templateCategory === selectedCategory;
      });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Icons.Mail;
      case 'linkedin': return Icons.Linkedin;
      case 'whatsapp': return Icons.MessageCircle;
      case 'sms': return Icons.MessageCircle;
      default: return Icons.FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return '#4C67FF';
      case 'linkedin': return '#0077B5';
      case 'whatsapp': return '#25D366';
      case 'sms': return '#A94CFF';
      default: return '#888';
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      alert('Please fill in template name and content');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing template
        await apiRequest(`/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            channel: formData.type,
            content: formData.content,
            subject: formData.subject,
            category: formData.category,
            variables: {
              name: formData.name,
              category: formData.category
            }
          })
        });
        alert('Template updated successfully');
      } else {
        // Create new template
        await apiRequest('/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            channel: formData.type,
            content: formData.content,
            subject: formData.subject,
            category: formData.category,
            variables: {
              name: formData.name,
              category: formData.category
            }
          })
        });
        alert('Template created successfully');
      }
      
      // Refresh templates
      const data = await apiRequest('/templates');
      setTemplates(data.templates || []);
      
      // Reset form and close modal
      setFormData({ name: '', type: 'email', subject: '', content: '', category: 'Outreach' });
      setShowCreateModal(false);
      setEditingTemplate(null);
    } catch (error: any) {
      console.error('Failed to save template:', error);
      alert(error?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeletingId(id);
    try {
      await apiRequest(`/templates/${id}`, { method: 'DELETE' });
      alert('Template deleted successfully');
      // Refresh templates
      const data = await apiRequest('/templates');
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      alert(error?.message || 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: (template.variables as any)?.name || '',
      type: template.channel || 'email',
      subject: (template.variables as any)?.subject || '',
      content: template.content || '',
      category: (template.variables as any)?.category || 'Outreach'
    });
    setShowCreateModal(true);
  };

  const handleDuplicateTemplate = async (template: any) => {
    setSaving(true);
    try {
      await apiRequest('/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: `${(template.variables as any)?.name || 'Template'} (Copy)`,
          channel: template.channel,
          content: template.content,
          subject: (template.variables as any)?.subject || '',
          category: (template.variables as any)?.category || 'Outreach',
          variables: template.variables
        })
      });
      alert('Template duplicated successfully');
      // Refresh templates
      const data = await apiRequest('/templates');
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error('Failed to duplicate template:', error);
      alert(error?.message || 'Failed to duplicate template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
        borderRadius: '20px',
        padding: '32px',
        border: '1px solid rgba(76, 103, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(76, 103, 255, 0.3)'
          }}>
            <Icons.FileText size={28} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              margin: '0 0 4px 0',
              background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
              Message Templates
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
              AI-optimized templates for all channels
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setFormData({ name: '', type: 'email', subject: '', content: '', category: 'Outreach' });
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
            className="btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(76, 103, 255, 0.3)'
            }}
          >
            <Icons.Plus size={18} />
            Create Template
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'btn-primary' : 'btn-ghost'}
            style={{
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: selectedCategory === category ? '600' : '500',
              transition: 'all 0.2s ease',
              border: selectedCategory === category ? 'none' : '1px solid var(--elev-border)'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <Icons.Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#4C67FF' }} />
          <div style={{ fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
            Loading templates...
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          background: 'var(--color-surface)',
          borderRadius: '24px',
          border: '2px dashed rgba(76, 103, 255, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(76, 103, 255, 0.05) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 32px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(76, 103, 255, 0.3)'
            }}>
              <Icons.FileText size={64} style={{ color: 'rgba(76, 103, 255, 0.6)' }} />
            </div>
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              No Templates Yet
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
              Create your first message template to get started with AI-optimized outreach
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
                boxShadow: '0 8px 24px rgba(76, 103, 255, 0.3)'
              }}
            >
              <Icons.Plus size={18} />
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', 
          gap: '24px' 
        }}>
          {filteredTemplates.map((template) => (
          <div 
            key={template.id} 
            className="card-enhanced"
            style={{
              background: 'var(--color-surface)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid var(--elev-border)',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(76, 103, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${getTypeColor(template.channel || template.type)}20 0%, ${getTypeColor(template.channel || template.type)}10 100%)`,
                  border: `1px solid ${getTypeColor(template.channel || template.type)}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {(() => {
                    const IconComponent = getTypeIcon(template.channel || template.type);
                    return <IconComponent size={24} style={{ color: getTypeColor(template.channel || template.type) }} />;
                  })()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--color-text)' }}>
                    {(template.variables as any)?.name || 'Untitled Template'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {(template.variables as any)?.category || 'Outreach'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>•</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {Object.keys(template.variables || {}).length} variables
                    </span>
                  </div>
                </div>
              </div>
              <span style={{
                background: `${getTypeColor(template.channel || template.type)}15`,
                color: getTypeColor(template.channel || template.type),
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: `1px solid ${getTypeColor(template.channel || template.type)}30`
              }}>
                {template.channel || template.type}
              </span>
            </div>

            {(template.variables as any)?.subject && (
              <div style={{ 
                background: 'var(--color-surface-secondary)', 
                borderRadius: '10px', 
                padding: '12px 14px', 
                fontSize: '13px', 
                color: 'var(--color-text)',
                marginBottom: '16px',
                border: '1px solid var(--elev-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Icons.Mail size={14} style={{ color: '#4C67FF', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Subject
                  </div>
                  <div style={{ fontWeight: '500' }}>{(template.variables as any).subject}</div>
                </div>
              </div>
            )}

            <div style={{ 
              background: 'var(--color-surface-secondary)', 
              borderRadius: '10px', 
              padding: '14px', 
              fontSize: '13px', 
              color: 'var(--color-text-muted)',
              marginBottom: '20px',
              border: '1px solid var(--elev-border)',
              maxHeight: '120px',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              fontFamily: 'var(--font-mono, monospace)'
            }}>
              {template.content}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleEditTemplate(template)}
                className="btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Icons.FileEdit size={14} />
                Edit
              </button>
              <button 
                onClick={() => handleDuplicateTemplate(template)}
                disabled={saving}
                className="btn-ghost"
                style={{
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {saving ? (
                  <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <Icons.FileEdit size={14} />
                    Duplicate
                  </>
                )}
              </button>
              <button 
                onClick={() => handleDeleteTemplate(template.id)}
                disabled={deletingId === template.id}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: deletingId === template.id ? 'not-allowed' : 'pointer',
                  opacity: deletingId === template.id ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (deletingId !== template.id) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                {deletingId === template.id ? (
                  <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <Icons.Trash size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--elev-bg)',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid var(--elev-border)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icons.FileText size={22} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                margin: 0,
                background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
              <input
                type="text"
                placeholder="Template name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={{
                    padding: '12px 16px 12px 44px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}>
                  {(() => {
                    const IconComponent = getTypeIcon(formData.type);
                    return <IconComponent size={18} style={{ color: getTypeColor(formData.type) }} />;
                  })()}
                </div>
              </div>

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Subject line (for email)"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              <textarea
                placeholder="Message content (use {{variable_name}} for personalization)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />

              <div style={{ 
                background: 'rgba(76, 103, 255, 0.1)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '12px', 
                color: 'var(--color-text-muted)',
                border: '1px solid rgba(76, 103, 255, 0.3)'
              }}>
                <strong>Tip:</strong> Use variables like {`{{first_name}}`}, {`{{company_name}}`}, {`{{industry}}`} to personalize your messages. AI will automatically fill these in based on lead data.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleSaveTemplate}
                disabled={saving || !formData.name.trim() || !formData.content.trim()}
                style={{
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (saving || !formData.name.trim() || !formData.content.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !formData.name.trim() || !formData.content.trim()) ? 0.6 : 1,
                  flex: 1
                }}
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'} Template
              </button>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  setFormData({ name: '', type: 'email', subject: '', content: '', category: 'Outreach' });
                }}
                disabled={saving}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
