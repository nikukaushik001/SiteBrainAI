import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

interface User {
  id: number;
  email: string;
  role: string;
}

export default function ClientsTab() {
  const { API_URL, getAuthHeaders, showToast, projects } = useDashboard();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Client Form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setIsCreating(true);
    
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ email: newEmail, password: newPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast('Client account created!', 'success');
        setNewEmail('');
        setNewPassword('');
        fetchUsers();
      } else {
        showToast(data.detail || 'Failed to create client', 'error');
      }
    } catch (e) {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignProject = async (userEmail: string, projectId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/assign?user_email=${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast(`Assigned ${userEmail} to project!`, 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Assignment failed', 'error');
      }
    } catch (e) {
      showToast('Network error during assignment', 'error');
    }
  };

  return (
    <div className="tab-pane animate-fade-in">
      <div className="tab-header">
        <div>
          <h2>Client Management</h2>
          <p>Create accounts for your clients and assign them to specific chatbot projects.</p>
        </div>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        
        {/* Create Client Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Create Client Account</h3>
          <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)}
                placeholder="client@business.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Temporary Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Must be at least 6 characters"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                required 
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : '+ Create Account'}
            </button>
          </form>
        </div>

        {/* Client List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Active Clients</h3>
          {isLoading ? (
            <p>Loading clients...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.filter(u => u.role === 'client').map(user => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px' }}>{user.email}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {user.id}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assigned Project:</span>
                    <select 
                      onChange={(e) => handleAssignProject(user.email, e.target.value)}
                      defaultValue=""
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="" disabled>Select Project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              
              {users.filter(u => u.role === 'client').length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  No client accounts exist yet. Create one on the left.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
