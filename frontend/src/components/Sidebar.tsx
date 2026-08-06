import { useState } from 'react';
import { useDashboard, type TabType } from '../context/DashboardContext';
import Logo from './Logo';

export default function Sidebar() {
  const {
    userRole, projects, activeProjectId, setActiveProjectId,
    activeTab, setActiveTab, API_URL, getAuthHeaders,
    handleAuthError, setProjects, showToast
  } = useDashboard();

  // Project Creation Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const handleOpenAddProjectModal = () => {
    setNewProjectName('');
    setIsProjectModalOpen(true);
  };

  const submitNewProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    const projName = newProjectName.trim();
    const projId = `sb_${projName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id: projId, name: projName })
      });
      if (handleAuthError(res)) {
        setIsCreatingProject(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => [...prev, data]);
        setActiveProjectId(data.id);
        setIsProjectModalOpen(false);
        setNewProjectName('');
        showToast(`Project "${projName}" created successfully!`, 'success');
      } else {
        showToast(data.detail || 'Failed to create project', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const navItems: { tab: TabType; icon: string; label: string; adminOnly?: boolean }[] = [
    { tab: 'overview',      icon: '📊', label: 'Overview' },
    { tab: 'playground',    icon: '💬', label: 'AI Playground' },
    { tab: 'leads',         icon: '📬', label: 'Leads & Bookings' },
    { tab: 'documents',     icon: '📄', label: 'Knowledge Base', adminOnly: true },
    { tab: 'analytics',     icon: '📈', label: 'Analytics & Intelligence' },
    { tab: 'conversations', icon: '🗂️', label: 'Conversations' },
    { tab: 'profile',       icon: '🏢', label: 'Business Profile' },
    { tab: 'billing',       icon: '💳', label: 'Billing & Subscription' },
    { tab: 'clients',       icon: '👥', label: 'Client Management', adminOnly: true },
    { tab: 'widget',        icon: '⚙️', label: 'Widget Studio', adminOnly: true },
    { tab: 'integration',   icon: '🔌', label: 'Integration Guide', adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || userRole === 'admin');

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-top-section">
          <Logo size="small" style={{ marginBottom: '28px' }} />

          {/* Admin Project Selector */}
          {userRole === 'admin' && (
            <div className="project-selector-box">
              <div className="project-selector-label">
                <span>Active Business Project</span>
                <button
                  onClick={handleOpenAddProjectModal}
                  style={{ fontSize: '11px', color: 'var(--accent-cyan)', padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
                >
                  + New
                </button>
              </div>
              <select
                className="project-select"
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nav Links */}
          <nav className="nav-links">
            {filteredNavItems.map(({ tab, icon, label }) => (
              <div
                key={tab}
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="status-badge">
            <span className="status-dot" />
            Backend: Online
          </div>
        </div>
      </aside>

      {/* Project Creation Modal */}
      {isProjectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in glass-panel">
            <h2>Create New Project</h2>
            <p>Give your new business or project a clear name to organize your AI knowledge base.</p>
            <form onSubmit={submitNewProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g. HireLoop AI"
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isCreatingProject || !newProjectName.trim()}>
                  {isCreatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
