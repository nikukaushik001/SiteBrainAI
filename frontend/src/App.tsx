import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'documents' | 'widget'>('overview');
  const [copied, setCopied] = useState(false);
  const [dbStats, setDbStats] = useState<{ total_chunks: number, status: string }>({ total_chunks: 0, status: 'connecting' });
  const [isResetting, setIsResetting] = useState(false);
  
  // Customizer State
  const [botName, setBotName] = useState('SiteBrain Assistant');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [greetingMsg, setGreetingMsg] = useState('Hi! How can I help you today?');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  // Playground Chat State
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your SiteBrain AI. Ask me anything based on your uploaded documents.' }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Upload State
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message: string }>({
    status: 'idle',
    message: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const API_URL = "http://127.0.0.1:8000";

  // Fetch vector stats on load
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/stats`);
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch {
      setDbStats({ total_chunks: 0, status: 'offline' });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isThinking]);

  // Handle Dynamic Embed Script Code
  const widgetCode = `<script 
  src="${API_URL}/static/sitebrain-widget.js" 
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

  // Handle PDF Upload
  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
      setUploadStatus({ status: 'error', message: 'Only PDF files are supported.' });
      return;
    }

    setUploadStatus({ status: 'uploading', message: `Uploading and chunking ${file.name}...` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ status: 'success', message: data.message });
        fetchStats();
      } else {
        setUploadStatus({ status: 'error', message: data.detail || 'Upload failed.' });
      }
    } catch {
      setUploadStatus({ status: 'error', message: 'Failed to connect to the backend API server.' });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Vector DB Reset
  const handleResetBrain = async () => {
    if (!window.confirm("Are you sure you want to reset your AI's Knowledge Base? All indexed chunks will be cleared.")) return;

    setIsResetting(true);
    try {
      const res = await fetch(`${API_URL}/reset`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Knowledge Base vector database reset successfully!");
        fetchStats();
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
        body: JSON.stringify({ question: userMsg })
      });
      const data = await res.json();
      if (res.ok) {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Error getting answer from AI backend.' }]);
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
            <div className="logo-icon">SB</div>
            <div className="logo-text">SiteBrainAI</div>
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
            Backend: FastAPI Online
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
                <p>Monitor your RAG AI Assistant knowledge base & integration health.</p>
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
                <div className="stat-icon" style={{ color: '#10b981' }}>🤖</div>
                <div className="stat-info">
                  <h4>AI Model Engine</h4>
                  <div className="stat-value" style={{ fontSize: '18px' }}>Llama 3.3 70B</div>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ color: '#06b6d4' }}>📦</div>
                <div className="stat-info">
                  <h4>Vector Store</h4>
                  <div className="stat-value" style={{ fontSize: '18px' }}>ChromaDB</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>🚀 Quick Getting Started Guide</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>1️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>Upload Business Docs</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Go to Knowledge Base and upload PDFs (handbooks, FAQs, menus).</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>2️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>Test in Playground</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ask questions in the AI Playground to verify accurate doc responses.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>3️⃣</div>
                  <h4 style={{ marginBottom: '6px' }}>Embed on Site</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Customize colors & copy the 1-line script tag to launch your site widget!</p>
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
                <p>Test your trained RAG AI Assistant live directly inside the dashboard.</p>
              </div>
              <button className="btn-secondary" onClick={() => setPlaygroundMessages([{ role: 'assistant', content: 'Chat history cleared. How can I help you?' }])}>
                🧹 Clear Chat
              </button>
            </header>

            <div className="playground-container glass-panel">
              <div className="playground-header">
                <h3><span>🧠</span> {botName} (Live Test Mode)</h3>
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
                    SiteBrain AI is retrieving documents & thinking...
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="chat-input-row">
                <input 
                  type="text" 
                  placeholder="Ask a question about your uploaded documents..." 
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
                <p>Upload PDFs to train your AI. ChromaDB will chunk and index your content automatically.</p>
              </div>
              <button className="btn-danger" onClick={handleResetBrain} disabled={isResetting}>
                {isResetting ? "Resetting..." : "🗑️ Reset Vector Brain"}
              </button>
            </header>

            <div className="upload-section glass-panel" style={{ padding: '36px', marginBottom: '32px' }}>
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
                <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Drop PDF files here or Click to Upload</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Supports menus, FAQs, policies, and documentation PDFs up to 50MB.</p>
                <input 
                  type="file" 
                  accept="application/pdf"
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

            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📊 Database Chunk Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent-indigo)', padding: '16px 24px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>TOTAL INDEXED VECTOR CHUNKS</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-indigo)' }}>{dbStats.total_chunks}</div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px' }}>
                  Your uploaded PDFs are chunked into 1,000-character segments and vectorized locally in ChromaDB for instant vector search.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET STUDIO & CUSTOMIZER TAB */}
        {activeTab === 'widget' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1>Widget Customization Studio</h1>
                <p>Personalize your widget appearance and copy your 1-line website snippet tag.</p>
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
                    Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on HTML, Wordpress, Shopify, or Wix sites:
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
                    👁️ LIVE WIDGET PREVIEW
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
                        What are your working hours?
                      </div>

                      <div className="chat-bubble assistant" style={{ fontSize: '13px', background: 'var(--bg-tertiary)' }}>
                        We are open Monday to Friday from 9 AM to 6 PM!
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
