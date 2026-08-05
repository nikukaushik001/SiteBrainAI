import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export default function BusinessProfileTab() {
  const { currentProject, activeProjectId, API_URL, getAuthHeaders, handleAuthError, fetchProjects, showToast } = useDashboard();
  
  const [businessName, setBusinessName] = useState(currentProject.name);
  const [contactEmail, setContactEmail] = useState(currentProject.support_email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentProject.phone_number || '');
  const [operatingHours, setOperatingHours] = useState(currentProject.operating_hours || 'Mon-Fri 9AM-5PM');
  const [aiPersona, setAiPersona] = useState(currentProject.ai_persona || 'Professional');
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          name: businessName,
          support_email: contactEmail,
          phone_number: phoneNumber,
          operating_hours: operatingHours,
          ai_persona: aiPersona
        })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        await fetchProjects(); // Refresh context
        showToast('Business profile and AI persona updated successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to update profile.', 'error');
      }
    } catch {
      showToast('Error saving profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Business Profile</h1>
          <p>Manage your business details and configure how your AI speaks to customers.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Business Details Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            🏢 Core Details
          </h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Business Name</label>
              <input 
                type="text" 
                value={businessName} 
                onChange={e => setBusinessName(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Support Email</label>
                <input 
                  type="email" 
                  value={contactEmail} 
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="support@example.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Operating Hours</label>
              <input 
                type="text" 
                value={operatingHours} 
                onChange={e => setOperatingHours(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>The AI will use this to tell customers when you are open.</p>
            </div>

            <button type="submit" className="btn-primary" disabled={isSaving} style={{ marginTop: '8px' }}>
              {isSaving ? 'Saving...' : 'Save Details'}
            </button>
          </form>
        </div>

        {/* AI Personality Config */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            🤖 AI Persona Settings
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
            Customize the personality and tone of your AI chatbot. This directly changes how the AI responds to your visitors.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['Professional', 'Friendly & Casual', 'Humorous & Witty', 'Urgent & Direct'].map((persona) => (
              <div 
                key={persona}
                onClick={() => setAiPersona(persona)}
                style={{
                  padding: '16px',
                  border: aiPersona === persona ? '2px solid var(--accent-indigo)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  background: aiPersona === persona ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: aiPersona === persona ? '5px solid var(--accent-indigo)' : '2px solid var(--text-muted)',
                  background: 'transparent'
                }}></div>
                <div style={{ fontWeight: aiPersona === persona ? 600 : 400, color: aiPersona === persona ? 'white' : 'var(--text-secondary)' }}>
                  {persona}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', color: 'var(--accent-emerald)', fontSize: '12px' }}>
              <strong>Tip:</strong> You can test your new AI persona in the <strong>💬 AI Playground</strong> after saving.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
