import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import '../App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface Project {
  id: string;
  name: string;
  system_prompt?: string;
  starter_prompts?: string;
}

interface AnalyticsLog {
  id: string;
  question: string;
  answer: string;
  is_unanswered: boolean;
  sentiment: string;
  timestamp: string;
}

interface AnalyticsData {
  total_queries: number;
  total_answered: number;
  total_unanswered: number;
  resolution_rate_pct: number;
  top_unanswered: { question: string; count: number }[];
  sentiment_breakdown?: { Positive: number; Neutral: number; Negative: number };
  recent_logs: AnalyticsLog[];
}

interface DetailedDoc {
  source: string;
  chunks: number;
  type: string;
  title?: string;
}

interface Lead {
  id: number;
  widget_id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  timestamp: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'documents' | 'analytics' | 'widget' | 'integration'>('overview');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'intelligence' | 'leads'>('intelligence');
  const [integrationTab, setIntegrationTab] = useState<'html' | 'react' | 'nextjs'>('html');
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState('client');

  // Project Creation Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const API_URL = 'http://127.0.0.1:8000';

  /** Returns auth headers for protected API calls. */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  /** If any protected call returns 401, force logout. */
  const handleAuthError = useCallback((res: Response) => {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
          if (data.length > 0) setActiveProjectId(data[0].id);
        } else {
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('isAuthenticated');
            navigate('/login');
          }
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, [navigate]);

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem('braindesk_active_project') || 'default_workspace';
    } catch {
      return 'default_workspace';
    }
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'client';
    setUserRole(role);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('braindesk_projects', JSON.stringify(projects));
      localStorage.setItem('braindesk_active_project', activeProjectId);
    } catch (e) {
      console.error(e);
    }
  }, [projects, activeProjectId]);

  const [dbStats, setDbStats] = useState<{ total_chunks: number; documents?: string[]; detailed_documents?: DetailedDoc[]; status: string }>({
    total_chunks: 0, documents: [], detailed_documents: [], status: 'connecting'
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_queries: 0, total_answered: 0, total_unanswered: 0,
    resolution_rate_pct: 100, top_unanswered: [], recent_logs: [],
    sentiment_breakdown: { Positive: 0, Neutral: 0, Negative: 0 }
  });
  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  // Customizer State
  const [botName, setBotName] = useState('BrainDesk Assistant');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [greetingMsg, setGreetingMsg] = useState('Hi! Welcome to our site. How can I help you today?');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [requireLead, setRequireLead] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [starterPrompts, setStarterPrompts] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Update customizer state when project changes
  useEffect(() => {
    const proj = projects.find(p => p.id === activeProjectId);
    if (proj && proj.system_prompt) setSystemPrompt(proj.system_prompt);
    else setSystemPrompt('');
    if (proj && proj.starter_prompts) setStarterPrompts(proj.starter_prompts);
    else setStarterPrompts('');
    if (proj && proj.webhook_url) setWebhookUrl(proj.webhook_url);
    else setWebhookUrl('');
  }, [activeProjectId, projects]);

  const handleUpdateSystemPrompt = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ system_prompt: systemPrompt })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === data.id ? data : p));
        alert('System prompt saved successfully!');
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to update system prompt');
      }
    } catch {
      alert('Error connecting to backend API');
    }
  };

  const handleSaveWebhook = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === data.id ? data : p));
        alert('Webhook URL saved successfully!');
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to update Webhook URL');
      }
    } catch {
      alert('Error connecting to backend API');
    }
  };

  // Playground Chat State
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am BrainDesk AI. Ask me anything about this business.' }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Upload & Scraping State
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [inputUrl, setInputUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<{ status: 'idle' | 'scraping' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [sitemapStatus, setSitemapStatus] = useState<{ status: 'idle' | 'crawling' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [isSavingStarterPrompts, setIsSavingStarterPrompts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0] || { id: activeProjectId, name: 'Loading...' };

  const fetchStats = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/stats?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      if (res.ok) setDbStats(await res.json());
    } catch {
      setDbStats({ total_chunks: 0, documents: [], detailed_documents: [], status: 'offline' });
    }
  };

  const fetchAnalytics = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/analytics?widget_id=${widgetId}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch { /* analytics fetch failure is non-critical */ }
  };

  const fetchLeads = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/leads?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      if (res.ok) setLeadsData(await res.json());
    } catch { /* leads fetch failure non-critical */ }
  };

  const fetchBookings = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setBookingsData(await res.json());
    } catch { /* bookings fetch failure non-critical */ }
  };

  const [isGeneratingFaq, setIsGeneratingFaq] = useState(false);
  const [faqResult, setFaqResult] = useState('');

  useEffect(() => {
    fetchStats(activeProjectId);
    fetchAnalytics(activeProjectId);
    fetchLeads(activeProjectId);
    fetchBookings(activeProjectId);
  }, [activeProjectId, activeTab]);

  const handleGenerateFAQ = async () => {
    setIsGeneratingFaq(true);
    setFaqResult('');
    try {
      const res = await fetch(`${API_URL}/analytics/generate-faq?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        setFaqResult(data.faq);
      } else {
        alert(data.detail || 'Failed to generate FAQ.');
      }
    } catch {
      alert('Error connecting to backend API');
    } finally {
      setIsGeneratingFaq(false);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isThinking]);

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
      } else {
        alert(data.detail || 'Failed to create project');
      }
    } catch {
      alert('Error connecting to backend API');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  const handleClearAnalytics = async () => {
    if (!window.confirm(`Clear query analytics logs for '${currentProject.name}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/analytics/clear?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      fetchAnalytics(activeProjectId);
    } catch {
      alert('Error clearing analytics logs.');
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('token') || '';
    window.open(`${API_URL}/analytics/export?widget_id=${activeProjectId}&token=${token}`, '_blank');
  };

  const widgetCode = `<script 
  src="${API_URL}/static/sitebrain-widget.js" 
  data-widget-id="${activeProjectId}"
  data-bot-name="${botName}" 
  data-color="${primaryColor}" 
  data-greeting="${greetingMsg}" 
  data-position="${position}"
  data-require-lead="${requireLead}">
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadStatus({ status: 'error', message: 'Only PDF files are supported.' });
      return;
    }
    setUploadStatus({ status: 'uploading', message: `Uploading ${file.name} for ${currentProject.name}...` });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_URL}/upload?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setUploadStatus({ status: 'success', message: data.message });
        fetchStats(activeProjectId);
      } else {
        setUploadStatus({ status: 'error', message: data.detail || 'Upload failed.' });
      }
    } catch {
      setUploadStatus({ status: 'error', message: 'Failed to connect to the backend API server.' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlScrape = async () => {
    if (!inputUrl.trim()) return;
    setScrapeStatus({ status: 'scraping', message: `Crawling website ${inputUrl}...` });
    try {
      const response = await fetch(`${API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: inputUrl.trim(), widget_id: activeProjectId })
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setScrapeStatus({ status: 'success', message: data.message });
        setInputUrl('');
        fetchStats(activeProjectId);
      } else {
        setScrapeStatus({ status: 'error', message: data.detail || 'Scraping failed.' });
      }
    } catch {
      setScrapeStatus({ status: 'error', message: 'Failed to connect to the backend server.' });
    }
  };

  const handleSitemapCrawl = async () => {
    if (!sitemapUrl.trim()) return;
    setSitemapStatus({ status: 'crawling', message: `Discovering and crawling all pages from sitemap...` });
    try {
      const response = await fetch(`${API_URL}/scrape/sitemap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: sitemapUrl.trim(), widget_id: activeProjectId })
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setSitemapStatus({ status: 'success', message: data.message });
        setSitemapUrl('');
        fetchStats(activeProjectId);
      } else {
        setSitemapStatus({ status: 'error', message: data.detail || 'Sitemap crawl failed.' });
      }
    } catch {
      setSitemapStatus({ status: 'error', message: 'Failed to connect to the backend server.' });
    }
  };

  const handleSaveStarterPrompts = async () => {
    setIsSavingStarterPrompts(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ starter_prompts: starterPrompts })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === data.id ? data : p));
        alert('Starter prompts saved!');
      }
    } catch {
      alert('Error saving starter prompts.');
    } finally {
      setIsSavingStarterPrompts(false);
    }
  };



  const handleDeleteDocument = async (sourceName: string) => {
    if (!window.confirm(`Are you sure you want to delete source '${sourceName}' from '${currentProject.name}'?`)) return;
    setDeletingSource(sourceName);
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ source: sourceName, widget_id: activeProjectId })
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Document deleted successfully!');
        fetchStats(activeProjectId);
      } else {
        alert('Failed to delete document: ' + (data.detail || 'Unknown error'));
      }
    } catch {
      alert('Error connecting to backend server.');
    } finally {
      setDeletingSource(null);
    }
  };

  const handleResetBrain = async () => {
    if (!window.confirm(`Reset the Knowledge Base for '${currentProject.name}'? Only vectors for this business will be cleared.`)) return;
    setIsResetting(true);
    try {
      const res = await fetch(`${API_URL}/reset?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) { setIsResetting(false); return; }
      const data = await res.json();
      if (res.ok) {
        alert(`Knowledge Base for '${currentProject.name}' reset successfully!`);
        fetchStats(activeProjectId);
      } else {
        alert('Error resetting database: ' + data.detail);
      }
    } catch {
      alert('Failed to connect to backend server.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSendQuestion = async () => {
    if (!inputQuestion.trim() || isThinking) return;
    const userMsg = inputQuestion.trim();
    setInputQuestion('');
    setPlaygroundMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsThinking(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, widget_id: activeProjectId })
      });
      const data = await res.json();
      if (res.ok) {
        setPlaygroundMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer,
          sources: data.sources || []
        }]);
        fetchAnalytics(activeProjectId);
      } else {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Error getting answer from BrainDesk AI.' }]);
      }
    } catch {
      setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Ensure your FastAPI server is running.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const getBasename = (str: string) => {
    try {
      if (str.startsWith('http')) {
        const u = new URL(str);
        return u.hostname + u.pathname;
      }
      return str.split(/[\\/]/).pop() || str;
    } catch {
      return str;
    }
  };

  const navItems = [
    { tab: 'overview' as const,    icon: '📊', label: 'Overview' },
    { tab: 'playground' as const,  icon: '💬', label: 'AI Playground' },
    { tab: 'documents' as const,   icon: '📄', label: 'Knowledge Base', adminOnly: true },
    { tab: 'analytics' as const,   icon: '📈', label: 'Analytics & Intelligence' },
    { tab: 'widget' as const,      icon: '⚙️', label: 'Widget Studio', adminOnly: true },
    { tab: 'integration' as const, icon: '🔌', label: 'Integration Guide' },
  ].filter(item => !item.adminOnly || userRole === 'admin');

  return (
    <div className="dashboard-layout">
      {/* ───────── SIDEBAR ───────── */}
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
            {navItems.map(({ tab, icon, label }) => (
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

      {/* ───────── MAIN CONTENT ───────── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-search">
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>🔍</span>
            <input type="text" placeholder={`Search ${currentProject.name}...`} />
          </div>
          <div className="topbar-actions">
            <button className="btn-secondary" style={{ padding: '8px 12px', lineHeight: 1 }}>🔔</button>
            <div className="topbar-avatar" title={userRole === 'admin' ? 'Admin Account' : 'Client Account'}>
              {userRole === 'admin' ? 'AD' : 'CL'}
            </div>
            <button className="btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="main-scroll-area">

          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <div className="header">
                <div>
                  <h1>Dashboard Overview</h1>
                  <p>Welcome back! Managing AI support for <strong>{currentProject.name}</strong>.</p>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card glass-panel">
                  <div className="stat-icon" style={{ color: 'var(--accent-indigo)' }}>⚡</div>
                  <div className="stat-info">
                    <h4>Indexed Vector Chunks</h4>
                    <div className="stat-value">{dbStats.total_chunks}</div>
                  </div>
                </div>

                <div className="stat-card glass-panel">
                  <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>📁</div>
                  <div className="stat-info">
                    <h4>Active Document Sources</h4>
                    <div className="stat-value">{dbStats.documents?.length || 0}</div>
                  </div>
                </div>

                <div className="stat-card glass-panel">
                  <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>💬</div>
                  <div className="stat-info">
                    <h4>Total Queries Handled</h4>
                    <div className="stat-value">{analyticsData.total_queries}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel section-panel">
                <div className="section-title">🚀 Quick Management</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => setActiveTab('playground')}>
                    💬 Launch AI Playground
                  </button>
                  {userRole === 'admin' && (
                    <>
                      <button className="btn-secondary" onClick={() => setActiveTab('documents')}>
                        📄 Manage Knowledge Base
                      </button>
                      <button className="btn-secondary" onClick={() => setActiveTab('widget')}>
                        ⚙️ Get HTML Widget Snippet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ PLAYGROUND TAB ═══════════════ */}
          {activeTab === 'playground' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="header">
                <div>
                  <h1>Live AI Sandbox Playground</h1>
                  <p>Interact live with the AI model for <strong>{currentProject.name}</strong> with real-time vector search &amp; source citations.</p>
                </div>
              </div>

              <div className="playground-container glass-panel" style={{ flex: 1, minHeight: 0 }}>
                <div className="chat-messages-area">
                  {playgroundMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.role}`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                      {/* Source Citations Display */}
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Citations:</span>
                          {msg.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              title={src}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(99,102,241,0.2)',
                                color: 'var(--accent-cyan)',
                                border: '1px solid rgba(99,102,241,0.4)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              {getBasename(src)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isThinking && (
                    <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⏳</span>
                      BrainDesk AI is searching the knowledge base &amp; generating a response...
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="chat-input-bar">
                  <input
                    type="text"
                    placeholder={`Ask a question about ${currentProject.name}...`}
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleSendQuestion()}
                    disabled={isThinking}
                  />
                  <button className="btn-primary" onClick={handleSendQuestion} disabled={isThinking}>
                    {isThinking ? 'Thinking...' : 'Send 🚀'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ KNOWLEDGE BASE TAB ═══════════════ */}
          {activeTab === 'documents' && (
            <div className="animate-fade-in">
              <div className="header">
                <div>
                  <h1>Knowledge Base</h1>
                  <p>Upload Documents (PDF, DOCX, TXT, CSV) or crawl website URLs for <strong>{currentProject.name}</strong>.</p>
                </div>
                <button className="btn-danger" onClick={handleResetBrain} disabled={isResetting}>
                  {isResetting ? 'Resetting...' : `🗑️ Reset Brain`}
                </button>
              </div>

              {/* Ingestion Grid */}
              <div className="ingestion-grid">
                {/* Document Uploader */}
                <div className="glass-panel section-panel">
                  <div className="section-title">
                    <span>📄</span> Document Upload
                  </div>
                  <p className="section-subtitle">Upload employee handbooks, pricing PDFs, text files, or CSVs.</p>

                  <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                    }}
                  >
                    <div className="upload-icon">📄</div>
                    <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Drop document here</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click or drag file (PDF, DOCX, TXT, CSV) · up to 50MB</p>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.csv"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />

                  </div>

                  {uploadStatus.status !== 'idle' && (
                    <div className={`upload-status ${uploadStatus.status}`}>
                      <p>{uploadStatus.message}</p>
                    </div>
                  )}
                </div>

                {/* Web URL Crawler */}
                <div className="glass-panel section-panel">
                  <div className="section-title">
                    <span>🌐</span> Web URL Crawler
                  </div>
                  <p className="section-subtitle">Paste any website link to scrape live web text automatically into the knowledge base.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      className="url-input"
                      type="text"
                      placeholder="e.g. https://mybusiness.com/faq"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
                    />
                    <button className="btn-primary" onClick={handleUrlScrape} disabled={scrapeStatus.status === 'scraping'}>
                      {scrapeStatus.status === 'scraping' ? 'Crawling Web Page...' : '🌐 Crawl & Index Website'}
                    </button>
                  </div>

                  {scrapeStatus.status !== 'idle' && (
                    <div className={`upload-status ${scrapeStatus.status}`} style={{ marginTop: '16px' }}>
                      <p>{scrapeStatus.message}</p>
                    </div>
                  )}
                </div>

                {/* Sitemap Auto-Crawler */}
                <div className="glass-panel section-panel" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-title">
                    <span>🗺️</span> Full Website Sitemap Crawler
                    <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
                  </div>
                  <p className="section-subtitle">
                    Paste your <code>sitemap.xml</code> URL to automatically discover and index <strong>all pages</strong> of a website at once — instead of adding URLs one by one. Up to 50 pages per crawl.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input
                      className="url-input"
                      type="text"
                      placeholder="e.g. https://mybusiness.com/sitemap.xml"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSitemapCrawl()}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-primary" onClick={handleSitemapCrawl} disabled={sitemapStatus.status === 'crawling'}>
                      {sitemapStatus.status === 'crawling' ? '⏳ Crawling All Pages...' : '🗺️ Crawl Full Sitemap'}
                    </button>
                  </div>

                  {sitemapStatus.status !== 'idle' && (
                    <div className={`upload-status ${sitemapStatus.status === 'crawling' ? 'uploading' : sitemapStatus.status}`} style={{ marginTop: '14px' }}>
                      <p>{sitemapStatus.message}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Knowledge Sources */}
              <div className="glass-panel section-panel">
                <div className="section-title">📊 Active Knowledge Sources ({currentProject.name})</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '22px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent-indigo)', padding: '14px 22px', borderRadius: '12px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Indexed Chunks
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-indigo)', lineHeight: 1 }}>
                      {dbStats.total_chunks}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                    BrainDesk RAG searches PDF documents and crawled URLs tagged with <code>widget_id: "{activeProjectId}"</code>.
                  </p>
                </div>

                {dbStats.detailed_documents && dbStats.detailed_documents.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.6px' }}>
                      📁 Managed Documents &amp; Sources ({dbStats.detailed_documents.length})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                      {dbStats.detailed_documents.map((docItem, idx) => {
                        const isWeb = docItem.type === 'web' || docItem.source.startsWith('http');
                        return (
                          <div
                            key={idx}
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '10px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ fontSize: '20px' }}>{isWeb ? '🌐' : '📄'}</span>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={docItem.source}>
                                  {docItem.title || getBasename(docItem.source)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                                  {docItem.source}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: isWeb ? 'rgba(6,182,212,0.18)' : 'rgba(16,185,129,0.18)', color: isWeb ? 'var(--accent-cyan)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                                  {isWeb ? 'Web URL' : 'PDF Document'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {docItem.chunks} {docItem.chunks === 1 ? 'chunk' : 'chunks'}
                                </span>
                              </div>
                              <button
                                className="btn-danger"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                disabled={deletingSource === docItem.source}
                                onClick={() => handleDeleteDocument(docItem.source)}
                              >
                                {deletingSource === docItem.source ? 'Deleting...' : '🗑️ Delete'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    No documents indexed for <strong>{currentProject.name}</strong> yet. Upload a PDF or crawl a website URL above!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ ANALYTICS & LEADS TAB ═══════════════ */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <div className="header">
                <div>
                  <h1>Analytics &amp; Intelligence</h1>
                  <p>Track conversation performance, missing answers, &amp; visitor leads for <strong>{currentProject.name}</strong>.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={handleGenerateFAQ} disabled={isGeneratingFaq}>
                    {isGeneratingFaq ? 'Generating...' : '🤖 Generate FAQ'}
                  </button>
                  <button className="btn-secondary" onClick={handleExportCSV}>
                    📥 Export CSV
                  </button>
                  <button className="btn-danger" onClick={handleClearAnalytics}>
                    🧹 Clear Logs
                  </button>
                </div>
              </div>

              {faqResult && (
                <div className="glass-panel section-panel" style={{ marginBottom: '20px' }}>
                  <div className="section-title">
                    <span>🤖</span> AI-Generated FAQ
                    <button className="btn-secondary" onClick={() => setFaqResult('')} style={{ float: 'right', padding: '4px 10px', fontSize: '12px' }}>Close</button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                    {faqResult}
                  </pre>
                </div>
              )}

              {/* Analytics Sub-Tab Navigation */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  className={`btn-secondary ${analyticsSubTab === 'intelligence' ? 'active-tab-btn' : ''}`}
                  style={{ background: analyticsSubTab === 'intelligence' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setAnalyticsSubTab('intelligence')}
                >
                  💡 Query Intelligence &amp; Logs
                </button>
                <button
                  className={`btn-secondary ${analyticsSubTab === 'leads' ? 'active-tab-btn' : ''}`}
                  style={{ background: analyticsSubTab === 'leads' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setAnalyticsSubTab('leads')}
                >
                  👥 Captured Leads ({leadsData.length})
                </button>
                <button
                  className={`btn-secondary ${analyticsSubTab === 'bookings' ? 'active-tab-btn' : ''}`}
                  style={{ background: analyticsSubTab === 'bookings' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setAnalyticsSubTab('bookings')}
                >
                  📅 Bookings ({bookingsData.length})
                </button>
              </div>

              {analyticsSubTab === 'intelligence' && (
                <>
                  <div className="stats-grid">
                    <div className="stat-card glass-panel">
                      <div className="stat-icon" style={{ color: '#06b6d4' }}>💬</div>
                      <div className="stat-info">
                        <h4>Total Questions</h4>
                        <div className="stat-value">{analyticsData.total_queries}</div>
                      </div>
                    </div>
                    <div className="stat-card glass-panel">
                      <div className="stat-icon" style={{ color: '#10b981' }}>🎯</div>
                      <div className="stat-info">
                        <h4>Resolution Rate</h4>
                        <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
                          {analyticsData.resolution_rate_pct}%
                        </div>
                      </div>
                    </div>
                    <div className="stat-card glass-panel">
                      <div className="stat-icon" style={{ color: '#ec4899' }}>⚠️</div>
                      <div className="stat-info">
                        <h4>Unanswered Queries</h4>
                        <div className="stat-value" style={{ color: '#f472b6' }}>
                          {analyticsData.total_unanswered}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Breakdown */}
                  <div className="glass-panel section-panel" style={{ marginBottom: '22px' }}>
                    <div className="section-title"><span>😊</span> Visitor Sentiment Analysis
                      <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
                    </div>
                    <p className="section-subtitle">AI-powered analysis of user emotions in their questions, helping you understand visitor satisfaction.</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
                      <div style={{ flex: 1, minWidth: '120px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>😊</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{analyticsData.sentiment_breakdown?.Positive ?? 0}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Positive</div>
                      </div>
                      <div style={{ flex: 1, minWidth: '120px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>😐</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-indigo)' }}>{analyticsData.sentiment_breakdown?.Neutral ?? 0}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Neutral</div>
                      </div>
                      <div style={{ flex: 1, minWidth: '120px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>😟</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#f87171' }}>{analyticsData.sentiment_breakdown?.Negative ?? 0}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Negative</div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-panel section-panel" style={{ marginBottom: '22px' }}>
                    <div className="section-title"><span>💡</span> Unanswered Questions Intelligence</div>
                    <p className="section-subtitle">
                      These are questions where the AI replied "I don't have that information". Update your PDFs to include these missing details!
                    </p>

                    {analyticsData.top_unanswered?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {analyticsData.top_unanswered.map((item, idx) => (
                          <div key={idx} className="unanswered-item">
                            <div className="unanswered-question">❓ "{item.question}"</div>
                            <div className="unanswered-count">Asked {item.count} time{item.count > 1 ? 's' : ''}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="success-state">
                        🎉 Great job! No unanswered customer questions flagged for {currentProject.name}.
                      </div>
                    )}
                  </div>

                  {/* Conversation Log Feed */}
                  <div className="glass-panel section-panel">
                    <div className="section-title">📜 Recent Conversation Logs</div>

                    {analyticsData.recent_logs?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                        {analyticsData.recent_logs.map(log => (
                          <div key={log.id} className="log-entry">
                            <div className="log-header">
                              <span className="log-timestamp">{log.timestamp}</span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {log.is_unanswered ? (
                                  <span className="log-status-badge" style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>⚠️ Unanswered</span>
                                ) : (
                                  <span className="log-status-badge" style={{ background: 'rgba(16,185,129,0.18)', color: 'var(--accent-emerald)' }}>✅ Answered</span>
                                )}
                                {log.sentiment === 'Positive' && (
                                  <span className="log-status-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>😊 Positive</span>
                                )}
                                {log.sentiment === 'Negative' && (
                                  <span className="log-status-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>😟 Negative</span>
                                )}
                              </div>
                            </div>
                            <div className="log-question">Q: {log.question}</div>
                            <div className="log-answer">A: {log.answer}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        No customer conversations logged for {currentProject.name} yet. Ask a question in the Playground to see logs appear here live!
                      </div>
                    )}
                  </div>
                </>
              )}

              {analyticsSubTab === 'leads' && (
                <div className="glass-panel section-panel">
                  <div className="section-title">👥 Captured Visitor Leads ({currentProject.name})</div>
                  <p className="section-subtitle">Visitors who submitted their name &amp; email prior to asking questions in your widget.</p>

                  {leadsData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Date/Time</th>
                            <th style={{ padding: '10px' }}>Visitor Name</th>
                            <th style={{ padding: '10px' }}>Email Address</th>
                            <th style={{ padding: '10px' }}>Widget Tenant ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsData.map(lead => (
                            <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{lead.timestamp}</td>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{lead.name}</td>
                              <td style={{ padding: '10px', color: 'var(--accent-cyan)' }}>{lead.email}</td>
                              <td style={{ padding: '10px', color: 'var(--text-secondary)' }}><code>{lead.widget_id}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      No visitor leads captured yet for <strong>{currentProject.name}</strong>. Enable "Require Lead Info" in Widget Studio to start capturing visitor emails!
                    </div>
                  )}
                </div>
              )}

              {analyticsSubTab === 'bookings' && (
                <div className="glass-panel section-panel">
                  <div className="section-title">📅 AI Agent Bookings ({currentProject.name})</div>
                  <p className="section-subtitle">Meetings and appointments autonomously booked by the AI Agent.</p>

                  {bookingsData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Booked For</th>
                            <th style={{ padding: '10px' }}>Customer Name</th>
                            <th style={{ padding: '10px' }}>Email Address</th>
                            <th style={{ padding: '10px' }}>Notes</th>
                            <th style={{ padding: '10px' }}>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookingsData.map(booking => (
                            <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                              <td style={{ padding: '10px', color: 'var(--accent-indigo)', fontWeight: 600 }}>{booking.booking_time}</td>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{booking.customer_name}</td>
                              <td style={{ padding: '10px', color: 'var(--accent-cyan)' }}>{booking.customer_email}</td>
                              <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{booking.notes}</td>
                              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{booking.timestamp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      No bookings captured yet for <strong>{currentProject.name}</strong>. Tell your AI Assistant to "book a meeting" in the system prompt.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ═══════════════ WIDGET STUDIO TAB ═══════════════ */}
          {activeTab === 'widget' && (
            <div className="animate-fade-in">
              <div className="header">
                <div>
                  <h1>Widget Studio</h1>
                  <p>Configure widget branding &amp; lead capture for <strong>{currentProject.name}</strong>.</p>
                </div>
              </div>

              <div className="customizer-grid">
                {/* Controls Column */}
                <div className="customizer-controls">
                  <div className="glass-panel section-panel">
                    <div className="section-title">🎨 Appearance &amp; Branding</div>

                    <div className="form-group">
                      <label>Bot Name</label>
                      <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>Welcome Message</label>
                      <input type="text" value={greetingMsg} onChange={(e) => setGreetingMsg(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>Primary Brand Color</label>
                      <div className="color-options">
                        {['#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'].map(color => (
                          <div
                            key={color}
                            className={`color-swatch ${primaryColor === color ? 'selected' : ''}`}
                            style={{ background: color }}
                            onClick={() => setPrimaryColor(color)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Screen Position</label>
                      <select value={position} onChange={(e) => setPosition(e.target.value as 'bottom-right' | 'bottom-left')}>
                        <option value="bottom-right">Bottom Right Corner</option>
                        <option value="bottom-left">Bottom Left Corner</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginTop: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={requireLead}
                          onChange={(e) => setRequireLead(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: primaryColor }}
                        />
                        Require Visitor Lead Info (Pre-chat Name/Email)
                      </label>
                    </div>
                  </div>

                  <div className="glass-panel section-panel">
                    <div className="section-title">🧠 Bot Personality (System Prompt)</div>
                    <p className="section-subtitle">Give your AI custom instructions, guardrails, or define its tone of voice.</p>
                    
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <textarea
                        style={{ width: '100%', height: '100px', resize: 'vertical', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: '#fff', fontSize: '13px', fontFamily: 'inherit' }}
                        placeholder="e.g. You are a helpful assistant for HireLoop. Keep answers short and professional. Never mention competitors."
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                      />
                    </div>
                    <button className="btn-secondary" onClick={handleUpdateSystemPrompt} style={{ width: '100%' }}>
                      💾 Save Instructions
                    </button>
                  </div>

                  <div className="glass-panel section-panel">
                    <div className="section-title">💬 Starter Prompt Chips
                      <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
                    </div>
                    <p className="section-subtitle">
                      Add quick-action chips that appear in your widget to guide visitors. Enter comma-separated prompts (e.g. <code>What's your pricing?, Book a demo, How does it work?</code>).
                    </p>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="What's your pricing?, Book a demo, How does it work?"
                        value={starterPrompts}
                        onChange={(e) => setStarterPrompts(e.target.value)}
                      />
                    </div>
                    {starterPrompts && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {starterPrompts.split(',').filter(s => s.trim()).map((chip, i) => (
                          <span key={i} style={{ padding: '6px 14px', borderRadius: '20px', background: `${primaryColor}22`, border: `1px solid ${primaryColor}55`, color: '#fff', fontSize: '12px', fontWeight: 600 }}>
                            {chip.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <button className="btn-secondary" onClick={handleSaveStarterPrompts} disabled={isSavingStarterPrompts} style={{ width: '100%' }}>
                      {isSavingStarterPrompts ? 'Saving...' : '💾 Save Starter Chips'}
                    </button>
                  </div>

                  <div className="glass-panel section-panel">
                    <div className="section-title">🔗 CRM Webhook Integration
                      <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
                    </div>
                    <p className="section-subtitle">
                      Automatically send captured leads to Zapier, Make, HubSpot, or any URL via HTTP POST.
                    </p>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <input
                        type="url"
                        placeholder="https://hooks.zapier.com/..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                    </div>
                    <button className="btn-secondary" onClick={handleSaveWebhook} style={{ width: '100%' }}>
                      💾 Save Webhook URL
                    </button>
                  </div>

                  <div className="glass-panel section-panel">
                    <div className="section-title">📋 HTML Embed Code</div>
                    <p className="section-subtitle">
                      Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on {currentProject.name}'s website:
                    </p>
                    <div className="code-box">{widgetCode}</div>
                    <button className="btn-primary" onClick={handleCopy} style={{ width: '100%' }}>
                      {copied ? '✅ Copied!' : '📋 Copy HTML Embed Snippet'}
                    </button>
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="preview-box">
                  <div className="preview-label">👁️ Live Widget Preview</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-6px', marginBottom: '4px' }}>
                    {currentProject.name} {requireLead ? '(Lead Form Enabled)' : ''}
                  </div>

                  <div className="widget-mockup">
                    <div className="widget-mockup-header" style={{ background: primaryColor }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px' }}>🤖</span>
                        {botName}
                      </div>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>● Online</span>
                    </div>

                    {requireLead ? (
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
                          Welcome! Please introduce yourself to start chatting.
                        </div>
                        <input
                          type="text"
                          readOnly
                          placeholder="Your Name *"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                        <input
                          type="email"
                          readOnly
                          placeholder="Your Email *"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                        <button style={{ background: primaryColor, color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 600, marginTop: '4px' }}>
                          Start Chatting
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="widget-mockup-body">
                          <div className="chat-bubble assistant" style={{ fontSize: '13px', background: 'var(--bg-tertiary)' }}>
                            {greetingMsg}
                          </div>
                          <div className="chat-bubble user" style={{ fontSize: '13px', background: primaryColor }}>
                            What are your operating hours?
                          </div>
                          <div className="chat-bubble assistant" style={{ fontSize: '13px', background: 'var(--bg-tertiary)' }}>
                            We are open 7 days a week, 9am–9pm!
                          </div>
                        </div>

                        <div className="widget-mockup-input-row">
                          <input
                            type="text"
                            readOnly
                            placeholder="Type a message..."
                            style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }}
                          />
                          <button style={{ background: primaryColor, color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Send
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ INTEGRATION TAB ═══════════════ */}
          {activeTab === 'integration' && (
            <div className="animate-fade-in">
              <div className="header">
                <div>
                  <h1>Integration Guide</h1>
                  <p>Step-by-step instructions to add BrainDesk AI to your platform.</p>
                </div>
              </div>

              {/* Integration Sub-tabs Navigation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button
                  className={`btn-secondary ${integrationTab === 'html' ? 'active-tab-btn' : ''}`}
                  style={{ background: integrationTab === 'html' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setIntegrationTab('html')}
                >
                  🌐 Basic HTML
                </button>
                <button
                  className={`btn-secondary ${integrationTab === 'react' ? 'active-tab-btn' : ''}`}
                  style={{ background: integrationTab === 'react' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setIntegrationTab('react')}
                >
                  ⚛️ React
                </button>
                <button
                  className={`btn-secondary ${integrationTab === 'nextjs' ? 'active-tab-btn' : ''}`}
                  style={{ background: integrationTab === 'nextjs' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
                  onClick={() => setIntegrationTab('nextjs')}
                >
                  ▲ Next.js
                </button>
              </div>

              <div className="stats-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
                
                {/* HTML Integration */}
                {integrationTab === 'html' && (
                  <div className="glass-panel section-panel animate-fade-in">
                    <div className="section-title">🌐 Basic HTML / Vanilla JS</div>
                    <p className="section-subtitle" style={{ marginBottom: '15px' }}>
                      For static websites, WordPress (via Custom HTML block), or any site where you can edit the HTML directly.
                    </p>
                    <ol style={{ paddingLeft: '20px', marginBottom: '15px', color: '#eaeaea' }}>
                      <li style={{ marginBottom: '8px' }}>Navigate to the <strong>Widget Studio</strong> tab and configure your bot's appearance and behavior.</li>
                      <li style={{ marginBottom: '8px' }}>Click the <strong>Copy HTML Embed Snippet</strong> button to copy your unique code.</li>
                      <li style={{ marginBottom: '8px' }}>Paste the snippet just before the closing <code>&lt;/body&gt;</code> tag of your website's HTML template.</li>
                    </ol>
                    <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                      {`<!-- Paste your BrainDesk AI snippet here -->\n<script\n  src="${API_URL}/static/sitebrain-widget.js"\n  data-widget-id="${activeProjectId}"\n  data-bot-name="${botName}"\n  data-color="${primaryColor}"\n  data-greeting="${greetingMsg}"\n  data-position="${position}"\n  data-require-lead="${requireLead}">\n</script>\n</body>\n</html>`}
                    </div>
                  </div>
                )}

                {/* React Integration */}
                {integrationTab === 'react' && (
                  <div className="glass-panel section-panel animate-fade-in">
                    <div className="section-title">⚛️ React (Vite / CRA)</div>
                    <p className="section-subtitle" style={{ marginBottom: '15px' }}>
                      For standard React applications. We recommend appending the script directly in your main layout or app component.
                    </p>
                    <ol style={{ paddingLeft: '20px', marginBottom: '15px', color: '#eaeaea' }}>
                      <li style={{ marginBottom: '8px' }}>Open your main layout file (e.g., <code>App.jsx</code> or <code>App.tsx</code>).</li>
                      <li style={{ marginBottom: '8px' }}>Use a <code>useEffect</code> hook to append the script tag to the document body when the app loads.</li>
                      <li style={{ marginBottom: '8px' }}>This ensures the chat widget persists across route changes in your Single Page Application.</li>
                    </ol>
                    <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                      {`import { useEffect } from 'react';\n\nexport default function App() {\n  useEffect(() => {\n    const script = document.createElement('script');\n    script.src = "${API_URL}/static/sitebrain-widget.js";\n    script.dataset.widgetId = "${activeProjectId}";\n    script.dataset.botName = "${botName}";\n    script.dataset.color = "${primaryColor}";\n    script.dataset.position = "${position}";\n    script.dataset.requireLead = "${requireLead}";\n    script.dataset.greeting = "${greetingMsg}";\n    script.async = true;\n    document.body.appendChild(script);\n\n    return () => {\n      // Cleanup if needed (optional)\n      // document.body.removeChild(script);\n    };\n  }, []);\n\n  return (\n    <div>\n      {/* Your app content */}\n    </div>\n  );\n}`}
                    </div>
                  </div>
                )}

                {/* Next.js Integration */}
                {integrationTab === 'nextjs' && (
                  <div className="glass-panel section-panel animate-fade-in">
                    <div className="section-title">▲ Next.js (App or Pages Router)</div>
                    <p className="section-subtitle" style={{ marginBottom: '15px' }}>
                      For Next.js applications, use the native <code>next/script</code> component for optimized loading.
                    </p>
                    <ol style={{ paddingLeft: '20px', marginBottom: '15px', color: '#eaeaea' }}>
                      <li style={{ marginBottom: '8px' }}>Open your root layout file (e.g., <code>app/layout.tsx</code>) or <code>pages/_document.tsx</code>.</li>
                      <li style={{ marginBottom: '8px' }}>Import the <code>Script</code> component from <code>next/script</code>.</li>
                      <li style={{ marginBottom: '8px' }}>Add the Script tag inside the body using the <code>lazyOnload</code> or <code>afterInteractive</code> strategy so it doesn't block page rendering.</li>
                    </ol>
                    <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                      {`import Script from 'next/script';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        \n        {/* BrainDesk AI Widget */}\n        <Script\n          src="${API_URL}/static/sitebrain-widget.js"\n          strategy="lazyOnload"\n          data-widget-id="${activeProjectId}"\n          data-bot-name="${botName}"\n          data-color="${primaryColor}"\n          data-greeting="${greetingMsg}"\n          data-position="${position}"\n          data-require-lead="${requireLead}"\n        />\n      </body>\n    </html>\n  );\n}`}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

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
    </div>
  );
}
