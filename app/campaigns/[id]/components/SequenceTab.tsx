import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";

interface Template {
  id: number;
  content: string;
  channel: string;
  variables?: any;
}

interface SequenceStep {
  id: number;
  content: string;
  channel: string;
  delay_days?: number;
  variables?: any;
}

interface SequenceTabProps {
  campaignId: number;
  templates: Template[];
  sequenceSteps: SequenceStep[];
  onRefresh: () => void;
}

export function SequenceTab({ campaignId, templates, sequenceSteps, onRefresh }: SequenceTabProps) {
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStep, setNewStep] = useState({
    templateId: '',
    delay: 1,
    channel: 'email' as 'email' | 'linkedin' | 'whatsapp' | 'sms'
  });

  const handleAddStep = async () => {
    if (!newStep.templateId) {
      alert('Please select a template');
      return;
    }
    
    try {
      const template = templates.find(t => t.id === Number(newStep.templateId));
      if (!template) {
        alert('Template not found');
        return;
      }
      
      await apiRequest(`/campaigns/${campaignId}/templates`, {
        method: 'POST',
        body: JSON.stringify({
          channel: newStep.channel,
          content: template.content,
          variables: template.variables,
          delay_days: newStep.delay
        })
      });
      
      onRefresh();
      setShowAddStepModal(false);
      setNewStep({ templateId: '', delay: 1, channel: 'email' });
      alert('Step added successfully');
    } catch (error: any) {
      console.error('Failed to add step:', error);
      alert(error?.message || 'Failed to add step');
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm('Delete this sequence step?')) return;
    
    try {
      await apiRequest(`/campaigns/${campaignId}/templates/${stepId}`, {
        method: 'DELETE'
      });
      
      onRefresh();
      alert('Step deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete step:', error);
      alert(error?.message || 'Failed to delete step');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Email Sequence</h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Configure your multi-step outreach sequence
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowAddStepModal(true)}
          style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Icons.Send size={16} />
          Add Step
        </button>
      </div>
      
      {sequenceSteps.length === 0 ? (
        <div style={{ 
          padding: 40, 
          textAlign: 'center',
          background: 'rgba(76, 103, 255, 0.05)',
          borderRadius: 12,
          border: '1px dashed rgba(76, 103, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: 'rgba(76, 103, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icons.FileText size={32} style={{ color: '#4C67FF' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No sequence steps yet</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Add steps to create your outreach sequence
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowAddStepModal(true)}
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Icons.Send size={16} />
            Add Step
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sequenceSteps.map((step, index) => (
            <div key={step.id} style={{
              background: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid var(--color-border)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: 14
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                      Step {index + 1}
                      {index > 0 && (
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                          (Wait {step.delay_days || 1} day{step.delay_days !== 1 ? 's' : ''} after step {index})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Channel: {step.channel} • Template: {(step.variables as any)?.name || 'Untitled'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteStep(step.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 107, 107, 0.2)',
                    border: '1px solid rgba(255, 107, 107, 0.5)',
                    borderRadius: 6,
                    color: '#ff6b6b',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                color: 'var(--color-text-muted)',
                whiteSpace: 'pre-wrap',
                maxHeight: 150,
                overflow: 'auto'
              }}>
                {step.content}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Step Modal */}
      {showAddStepModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 20,
            padding: 32,
            border: '1px solid var(--color-border)',
            maxWidth: 500,
            width: '100%'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Add Sequence Step</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Template</label>
                <select
                  value={newStep.templateId}
                  onChange={(e) => setNewStep({ ...newStep, templateId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    fontSize: 14
                  }}
                >
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {(t.variables as any)?.name || 'Untitled'} ({t.channel})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Channel</label>
                <select
                  value={newStep.channel}
                  onChange={(e) => setNewStep({ ...newStep, channel: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    fontSize: 14
                  }}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                  Delay (days after previous step)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newStep.delay}
                  onChange={(e) => setNewStep({ ...newStep, delay: parseInt(e.target.value) || 1 })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    fontSize: 14
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleAddStep}
                disabled={!newStep.templateId}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: !newStep.templateId 
                    ? 'rgba(76, 103, 255, 0.3)' 
                    : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: !newStep.templateId ? '#888' : '#000000',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !newStep.templateId ? 'not-allowed' : 'pointer'
                }}
              >
                Add Step
              </button>
              <button
                onClick={() => {
                  setShowAddStepModal(false);
                  setNewStep({ templateId: '', delay: 1, channel: 'email' });
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  color: 'var(--color-text)',
                  fontSize: 14,
                  cursor: 'pointer'
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

