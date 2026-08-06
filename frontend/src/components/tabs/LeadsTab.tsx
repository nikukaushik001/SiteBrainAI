import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

interface Lead {
  id: number;
  widget_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  timestamp: string;
}

export default function LeadsTab() {
  const { currentProject, API_URL, getAuthHeaders, showToast } = useDashboard();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentProject?.id) {
      fetchLeads();
    }
  }, [currentProject?.id]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/leads?widget_id=${currentProject.id}`, { 
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`${API_URL}/api/leads/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Lead deleted.', 'info');
        setLeads(prev => prev.filter(l => l.id !== id));
      } else {
        showToast('Failed to delete lead.', 'error');
      }
    } catch (e) {
      showToast('Network error.', 'error');
    }
  };

  return (
    <div className="tab-pane animate-fade-in">
      <div className="tab-header">
        <div>
          <h2>Leads & Bookings</h2>
          <p>View customers who wanted to book or get a quote through your AI.</p>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <div className="table-container glass-panel">
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Phone</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No leads captured yet. Chat with the AI and ask to book a service to test this feature!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(lead.timestamp).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: '12px 16px' }}>{lead.email}</td>
                    <td style={{ padding: '12px 16px' }}>{lead.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <a 
                          href={`mailto:${lead.email}`}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
                        >
                          Email
                        </a>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
