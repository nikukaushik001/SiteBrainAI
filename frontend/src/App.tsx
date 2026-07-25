import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Project {
  id: string;
  name: string;
}

interface AnalyticsLog {
  id: string;
  question: string;
  answer: string;
  is_unanswered: boolean;
  timestamp: string;
}

interface AnalyticsData {
  total_queries: number;
  total_answered: number;
  total_unanswered: number;
  resolution_rate_pct: number;
  top_unanswered: { question: string; count: number }[];
  recent_logs: AnalyticsLog[];
}

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'documents' | 'analytics' | 'widget'>('overview');
  const [copied, setCopied] = useState(false);

  // Projects / Multi-Tenant State (Persisted in localStorage)
  const initialProjects: Project[] = [
    { id: 'default_workspace', name: 'My Workspace' }
  ];

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('docsaura_projects');
      return saved ? JSON.parse(saved) : initialProjects;
    } catch {
      return initialProjects;
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('docsaura_active_project');
      return savedId || 'default_workspace';
    } catch {
      return 'default_workspace';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('docsaura_projects', JSON.stringify(projects));
      localStorage.setItem('docsaura_active_project', activeProjectId);
    } catch (e) {
      console.error(e);
    }
  }, [projects, activeProjectId]);



  const [dbStats, setDbStats] = useState<{ total_chunks: number, documents?: string[], status: string }>({ total_chunks: 0, documents: [], status: 'connecting' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_queries: 0,
    total_answered: 0,
    total_unanswered: 0,
    resolution_rate_pct: 100,
    top_unanswered: [],
    recent_logs: []
  });
  const [isResetting, setIsResetting] = useState(false);

  // Customizer State
  const [botName, setBotName] = useState('DocsAura Assistant');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [greetingMsg, setGreetingMsg] = useState('Hi! Welcome to our site. How can I help you today?');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  // Playground Chat State
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am DocsAura AI. Ask me anything about this business.' }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Upload & Scraping State
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message: string }>({
    status: 'idle',
    message: ''
  });
  const [inputUrl, setInputUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<{ status: 'idle' | 'scraping' | 'success' | 'error', message: string }>({
    status: 'idle',
    message: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);


  const API_URL = "http://127.0.0.1:8000";

  // Active Project Helper
  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Fetch vector stats
  const fetchStats = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/stats?widget_id=${widgetId}`);
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch {
      setDbStats({ total_chunks: 0, documents: [], status: 'offline' });
    }
  };

  // Fetch analytics metrics
  const fetchAnalytics = async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/analytics?widget_id=${widgetId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats(activeProjectId);
    fetchAnalytics(activeProjectId);
  }, [activeProjectId, activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isThinking]);

  // Handle New Project Creation
  const handleAddProject = () => {
    const projName = window.prompt("Enter new Business/Project Name:");
    if (!projName || !projName.trim()) return;

    const projId = `sb_${projName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newProj = { id: projId, name: projName.trim() };
    setProjects(prev => [...prev, newProj]);
    setActiveProjectId(projId);
  };

  // Handle Clear Analytics Logs
  const handleClearAnalytics = async () => {
    if (!window.confirm(`Clear query analytics logs for '${currentProject.name}'?`)) return;
    try {
      await fetch(`${API_URL}/analytics/clear?widget_id=${activeProjectId}`, { method: 'POST' });
      fetchAnalytics(activeProjectId);
    } catch {
      alert("Error clearing analytics logs.");
    }
  };

  // Handle Dynamic Embed Script Code
  const widgetCode = `<script 
  src="${API_URL}/static/sitebrain-widget.js" 
  data-widget-id="${activeProjectId}"
  data-bot-name="${botName}" 
  data-color="${primaryColor}" 
  data-greeting="${greetingMsg}" 
  data-position="${position}">
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle PDF Upload for Active Tenant
  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
      setUploadStatus({ status: 'error', message: 'Only PDF files are supported.' });
      return;
    }

    setUploadStatus({ status: 'uploading', message: `Uploading ${file.name} for ${currentProject.name}...` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload?widget_id=${activeProjectId}`, {
        method: "POST",
        body: formData,
      });

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

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Web URL Crawling
  const handleUrlScrape = async () => {
    if (!inputUrl.trim()) return;

    setScrapeStatus({ status: 'scraping', message: `Crawling website ${inputUrl}...` });

    try {
      const response = await fetch(`${API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim(), widget_id: activeProjectId })
      });

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


  // Handle Vector DB Reset for Active Tenant
  const handleResetBrain = async () => {
    if (!window.confirm(`Are you sure you want to reset the Knowledge Base for '${currentProject.name}'? Only vectors for this business will be cleared.`)) return;

    setIsResetting(true);
    try {
      const res = await fetch(`${API_URL}/reset?widget_id=${activeProjectId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Knowledge Base for '${currentProject.name}' reset successfully!`);
        fetchStats(activeProjectId);
      } else {
        alert("Error resetting database: " + data.detail);
      }
    } catch {
      alert("Failed to connect to backend server.");
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Playground Question Submit
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
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
        fetchAnalytics(activeProjectId);
      } else {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Error getting answer from DocsAura AI.' }]);
      }
    } catch {
      setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Ensure your FastAPI server is running.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <div className="logo-icon">✨</div>
            <div className="logo-text">DocsAuraAI</div>
          </div>

          {/* Project Selector Box */}
          <div className="project-selector-box">
            <div className="project-selector-label">
              <span>Active Business Project</span>
              <button
                onClick={handleAddProject}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
              >
                + New Project
              </button>
            </div>
            <select
              className="project-select"
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  📁 {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <nav className="nav-links">
            <div
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>📊</span> Overview
            </div>

            <div
              className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`}
              onClick={() => setActiveTab('playground')}
            >
              <span>💬</span> AI Playground
            </div>

            <div
              className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <span>📄</span> Knowledge Base
            </div>

            <div
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span>📈</span> Analytics & Insights
            </div>

            <div
              className={`nav-item ${activeTab === 'widget' ? 'active' : ''}`}
              onClick={() => setActiveTab('widget')}
            >
              <span>⚙️</span> Widget Studio
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="status-badge">
            <span className="status-dot"></span>
            DocsAura Backend: Online
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>Dashboard Overview</h1>
                <p>Manage <strong>{currentProject.name}</strong> (Tenant ID: <code>{activeProjectId}</code>)</p>
              </div>
            </header>

            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ color: '#6366f1' }}>⚡</div>
                <div className="stat-info">
                  <h4>Indexed Chunks</h4>
                  <div className="stat-value">{dbStats.total_chunks}</div>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ color: '#10b981' }}>📈</div>
                <div className="stat-info">
                  <h4>Resolution Rate</h4>
                  <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{analyticsData.resolution_rate_pct}%</div>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ color: '#ec4899' }}>⚠️</div>
                <div className="stat-info">
                  <h4>Unanswered Queries</h4>
                  <div className="stat-value" style={{ color: '#f472b6' }}>{analyticsData.total_unanswered}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>✨ DocsAura Multi-Tenant Guide</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>1️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>Select or Create Project</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Use the sidebar dropdown to switch between business clients or add new ones.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>2️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>Upload Dedicated Docs</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Upload PDFs for {currentProject.name}. All vector data is isolated under <code>{activeProjectId}</code>.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>3️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>View Analytics Intelligence</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Check the Analytics tab to see unanswered questions and missing info in your PDFs!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI PLAYGROUND TAB */}
        {activeTab === 'playground' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>AI Chat Playground</h1>
                <p>Test <strong>{currentProject.name}</strong> AI responses live inside the dashboard sandbox.</p>
              </div>
              <button className="btn-secondary" onClick={() => setPlaygroundMessages([{ role: 'assistant', content: `Chat cleared for ${currentProject.name}. How can I help?` }])}>
                🧹 Clear Chat
              </button>
            </header>

            <div className="playground-container glass-panel">
              <div className="playground-header">
                <h3><span>✨</span> {botName} ({currentProject.name})</h3>
                <span className="status-badge"><span className="status-dot"></span> Ready</span>
              </div>

              <div className="chat-messages-box">
                {playgroundMessages.map((msg, index) => (
                  <div key={index} className={`chat-bubble ${msg.role}`}>
                    {msg.content}
                  </div>
                ))}
                {isThinking && (
                  <div className="chat-bubble assistant" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                    DocsAura AI is retrieving {currentProject.name} documents & thinking...
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="chat-input-row">
                <input
                  type="text"
                  placeholder={`Ask a question about ${currentProject.name}...`}
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                />
                <button className="btn-primary" onClick={handleSendQuestion} disabled={isThinking}>
                  Send 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>Knowledge Base Management</h1>
                <p>Upload PDFs or crawl website URLs for <strong>{currentProject.name}</strong> (Tenant ID: <code>{activeProjectId}</code>).</p>
              </div>
              <button className="btn-danger" onClick={handleResetBrain} disabled={isResetting}>
                {isResetting ? "Resetting..." : `🗑️ Reset ${currentProject.name} Brain`}
              </button>
            </header>

            {/* Ingestion Options Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              {/* PDF Uploader */}
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📄</span> PDF Document Upload
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Upload employee handbooks, pricing PDFs, menus, or FAQs.
                  </p>

                  <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                    }}
                    style={{ padding: '36px 20px' }}
                  >
                    <div className="upload-icon" style={{ fontSize: '36px' }}>📄</div>
                    <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>Drop PDF file here</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Click or drag PDF up to 50MB</p>
                    <input
                      type="file"
                      accept="application/pdf"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                  </div>
                </div>

                {uploadStatus.status !== 'idle' && (
                  <div className={`upload-status ${uploadStatus.status}`} style={{ marginTop: '16px', fontSize: '13px' }}>
                    <p>{uploadStatus.message}</p>
                  </div>
                )}
              </div>

              {/* Web URL Crawler */}
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🌐</span> Web URL Scraper & Crawler
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Type any website link to scrape live web text automatically into ChromaDB.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="e.g. https://mybusiness.com/faq"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none' }}
                    />
                    <button className="btn-primary" onClick={handleUrlScrape} disabled={scrapeStatus.status === 'scraping'}>
                      {scrapeStatus.status === 'scraping' ? "Crawling Web Page..." : "🌐 Crawl & Index Website"}
                    </button>
                  </div>
                </div>

                {scrapeStatus.status !== 'idle' && (
                  <div className={`upload-status ${scrapeStatus.status}`} style={{ marginTop: '16px', fontSize: '13px' }}>
                    <p>{scrapeStatus.message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Documents & Database Status */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📊 Active Knowledge Sources ({currentProject.name})</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent-indigo)', padding: '16px 24px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>TOTAL INDEXED CHUNKS ({activeProjectId})</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-indigo)' }}>{dbStats.total_chunks}</div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '450px' }}>
                  DocsAura RAG searches both PDF documents and Crawled Website URLs tagged with <code>widget_id: "{activeProjectId}"</code>.
                </p>
              </div>

              {dbStats.documents && dbStats.documents.length > 0 ? (
                <div>
                  <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                    📁 Active Knowledge Files & URLs ({dbStats.documents.length}):
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {dbStats.documents.map((doc, idx) => {
                      const isWeb = doc.startsWith("http://") || doc.startsWith("https://");
                      return (
                        <div key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-active)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '100%', overflow: 'hidden' }}>
                          <span>{isWeb ? "🌐" : "📄"}</span>
                          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{doc}</strong>
                          <span style={{ fontSize: '11px', background: isWeb ? 'rgba(6,182,212,0.2)' : 'rgba(16,185,129,0.2)', color: isWeb ? 'var(--accent-cyan)' : 'var(--accent-emerald)', padding: '2px 6px', borderRadius: '4px' }}>
                            {isWeb ? "Web URL" : "PDF File"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No documents or URLs indexed for <strong>{currentProject.name}</strong> yet. Upload a PDF or Crawl a Website URL above to populate your AI brain!
                </div>
              )}
            </div>
          </div>
        )}


        {/* ANALYTICS & INSIGHTS TAB */}
        {activeTab === 'analytics' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>AI Analytics & Intelligence</h1>
                <p>Track conversation performance & missing document details for <strong>{currentProject.name}</strong>.</p>
              </div>
              <button className="btn-secondary" onClick={handleClearAnalytics}>
                🧹 Clear Analytics Logs
              </button>
            </header>

            {/* Metrics */}
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
                  <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{analyticsData.resolution_rate_pct}%</div>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ color: '#ec4899' }}>⚠️</div>
                <div className="stat-info">
                  <h4>Unanswered Queries</h4>
                  <div className="stat-value" style={{ color: '#f472b6' }}>{analyticsData.total_unanswered}</div>
                </div>
              </div>
            </div>

            {/* Unanswered Intelligence Card */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>💡</span> Unanswered Questions Intelligence
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                These are questions customers asked where the AI replied *"I don't have that information"*. Update your PDFs to include these missing details!
              </p>

              {analyticsData.top_unanswered && analyticsData.top_unanswered.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analyticsData.top_unanswered.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '14px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fca5a5' }}>
                        ❓ "{item.question}"
                      </div>
                      <div style={{ fontSize: '12px', background: 'rgba(239,68,68,0.2)', color: '#ffffff', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                        Asked {item.count} time{item.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', color: 'var(--accent-emerald)', fontSize: '14px', fontWeight: 600 }}>
                  🎉 Great job! No unanswered customer questions flagged for {currentProject.name}.
                </div>
              )}
            </div>

            {/* Conversation Log Feed */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📜 Recent Customer Conversation Logs</h3>

              {analyticsData.recent_logs && analyticsData.recent_logs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                  {analyticsData.recent_logs.map(log => (
                    <div key={log.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                        {log.is_unanswered ? (
                          <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            ⚠️ Unanswered / Needs Info
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.2)', color: 'var(--accent-emerald)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            ✅ Answered from PDF
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                        Q: {log.question}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px' }}>
                        A: {log.answer}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No customer conversations logged for {currentProject.name} yet. Ask a question in the Playground to see logs appear here live!
                </div>
              )}
            </div>

          </div>
        )}

        {/* WIDGET STUDIO & CUSTOMIZER TAB */}
        {activeTab === 'widget' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>Widget Customization Studio</h1>
                <p>Configure widget branding for <strong>{currentProject.name}</strong> (Tenant ID: <code>{activeProjectId}</code>)</p>
              </div>
            </header>

            <div className="customizer-grid">
              {/* Controls */}
              <div>
                <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>🎨 Appearance & Branding</h3>

                  <div className="form-group">
                    <label>Bot Name</label>
                    <input
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Welcome Message</label>
                    <input
                      type="text"
                      value={greetingMsg}
                      onChange={(e) => setGreetingMsg(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Primary Brand Accent Color</label>
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
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as 'bottom-right' | 'bottom-left')}
                    >
                      <option value="bottom-right">Bottom Right Corner</option>
                      <option value="bottom-left">Bottom Left Corner</option>
                    </select>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>📋 HTML Embed Code</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on {currentProject.name}'s website:
                  </p>

                  <div className="code-box">
                    {widgetCode}
                  </div>

                  <button className="btn-primary" onClick={handleCopy} style={{ width: '100%' }}>
                    {copied ? "✅ Copied Embed Code!" : "📋 Copy HTML Snippet Tag"}
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div className="preview-box">
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    👁️ LIVE WIDGET PREVIEW ({currentProject.name})
                  </div>

                  <div className="widget-mockup">
                    <div className="widget-mockup-header" style={{ background: primaryColor }}>
                      <div>{botName}</div>
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>● Online</span>
                    </div>

                    <div className="widget-mockup-body">
                      <div className="chat-bubble assistant" style={{ fontSize: '13px', background: 'var(--bg-tertiary)', marginBottom: '12px' }}>
                        {greetingMsg}
                      </div>

                      <div className="chat-bubble user" style={{ fontSize: '13px', background: primaryColor, marginBottom: '12px', alignSelf: 'flex-end' }}>
                        What are your operating hours?
                      </div>

                      <div className="chat-bubble assistant" style={{ fontSize: '13px', background: 'var(--bg-tertiary)' }}>
                        We are open 7 days a week!
                      </div>
                    </div>

                    <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        readOnly
                        placeholder="Type a message..."
                        style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                      />
                      <button style={{ background: primaryColor, color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
