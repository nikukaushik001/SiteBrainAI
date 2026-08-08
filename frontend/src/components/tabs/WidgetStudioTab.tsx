import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export default function WidgetStudioTab() {
  const {
    currentProject, activeProjectId, API_URL, projects,
    getAuthHeaders, handleAuthError, setProjects, showToast
  } = useDashboard();

  // Customizer State
  const [botName, setBotName] = useState('BrainDesk Assistant');
  const [primaryColor, setPrimaryColor] = useState('#ef4444');
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [botAvatarUrl, setBotAvatarUrl] = useState('');
  const [proactiveMessage, setProactiveMessage] = useState('');
  
  const [greetingMsg, setGreetingMsg] = useState('Hi! Welcome to our site. How can I help you today?');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [requireLead, setRequireLead] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [starterPrompts, setStarterPrompts] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isSavingStarterPrompts, setIsSavingStarterPrompts] = useState(false);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update customizer state when project changes
  useEffect(() => {
    const proj = projects.find(p => p.id === activeProjectId);
    if (proj && proj.system_prompt) setSystemPrompt(proj.system_prompt); else setSystemPrompt('');
    if (proj && proj.starter_prompts) setStarterPrompts(proj.starter_prompts); else setStarterPrompts('');
    if (proj && proj.webhook_url) setWebhookUrl(proj.webhook_url); else setWebhookUrl('');
    if (proj && proj.allowed_domains) setAllowedDomains(proj.allowed_domains); else setAllowedDomains('');
    
    // Styling states
    if (proj && proj.theme_color) setPrimaryColor(proj.theme_color); else setPrimaryColor('#ef4444');
    if (proj && proj.font_family) setFontFamily(proj.font_family); else setFontFamily('Inter, sans-serif');
    if (proj && proj.bot_avatar_url) setBotAvatarUrl(proj.bot_avatar_url); else setBotAvatarUrl('');
    if (proj && proj.proactive_message) setProactiveMessage(proj.proactive_message); else setProactiveMessage('');
  }, [activeProjectId, projects]);

  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ 
          theme_color: primaryColor,
          font_family: fontFamily,
          bot_avatar_url: botAvatarUrl,
          proactive_message: proactiveMessage
        })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === data.id ? data : p));
        showToast('Appearance settings saved successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to save appearance', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsSavingAppearance(false);
    }
  };

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
        showToast('System prompt saved successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to update system prompt', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
    }
  };

  const handleSaveDomains = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ allowed_domains: allowedDomains })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === data.id ? data : p));
        showToast('Allowed domains saved successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to update domains', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
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
        showToast('Webhook URL saved successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to update Webhook URL', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
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
        showToast('Starter prompts saved!', 'success');
      }
    } catch {
      showToast('Error saving starter prompts.', 'error');
    } finally {
      setIsSavingStarterPrompts(false);
    }
  };

  const widgetCode = `<script \n  src="${API_URL}/static/sitebrain-widget.js" \n  data-widget-id="${activeProjectId}"\n  data-bot-name="${botName}" \n  data-color="${primaryColor}" \n  data-greeting="${greetingMsg}" \n  data-position="${position}"\n  data-require-lead="${requireLead}"\n  data-font-family="${fontFamily}"\n  data-bot-avatar-url="${botAvatarUrl}"\n  data-proactive-message="${proactiveMessage}">\n</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    showToast('Widget code copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
                {['#ef4444', '#f59e0b', '#f43f5e', '#ec4899', '#10b981', '#f59e0b'].map(color => (
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

            <div className="form-group">
              <label>Font Family</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                <option value="Inter, sans-serif">Inter (Modern)</option>
                <option value="Roboto, sans-serif">Roboto (Clean)</option>
                <option value="'Courier New', monospace">Monospace (Code)</option>
                <option value="Georgia, serif">Georgia (Classic)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bot Avatar URL</label>
              <input type="text" placeholder="https://example.com/avatar.png" value={botAvatarUrl} onChange={(e) => setBotAvatarUrl(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Proactive Popup Message (Optional)</label>
              <input type="text" placeholder="e.g. Chat with us!" value={proactiveMessage} onChange={(e) => setProactiveMessage(e.target.value)} />
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
            <button className="btn-primary" onClick={handleSaveAppearance} disabled={isSavingAppearance} style={{ marginTop: '10px', width: '100%' }}>
              {isSavingAppearance ? 'Saving...' : '💾 Save Appearance'}
            </button>
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
            <div className="section-title">💬 Quick Suggestion Buttons
              <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
            </div>
            <p className="section-subtitle">
              These are clickable buttons that appear inside your chatbot to help visitors get started. Separate each suggestion with a comma.
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
            <div className="section-title">📤 Auto-Send New Leads to Your Tools
              <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
            </div>
            <p className="section-subtitle">
              Every time a visitor gives their name &amp; email in the chatbot, we can automatically send that info to your other tools — like <strong>Google Sheets</strong>, <strong>Mailchimp</strong>, <strong>HubSpot</strong>, or <strong>Slack</strong>. Just paste the automation link from <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>Zapier</a> or <a href="https://make.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>Make.com</a> below.
            </p>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Automation Link (from Zapier, Make, or similar)</label>
              <input
                type="url"
                placeholder="Paste your automation URL here..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <button className="btn-secondary" onClick={handleSaveWebhook} style={{ width: '100%' }}>
              💾 Save Automation Link
            </button>
          </div>

          <div className="glass-panel section-panel">
            <div className="section-title">🔒 Domain Security (Whitelisting)</div>
            <p className="section-subtitle">
              Protect your widget! Enter the domains (URLs) where this widget is allowed to load. Separate multiple domains with commas.
            </p>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="e.g. https://mywebsite.com, https://shop.mywebsite.com"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
              />
            </div>
            <button className="btn-secondary" onClick={handleSaveDomains} style={{ width: '100%' }}>
              💾 Save Allowed Domains
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
                <input type="text" readOnly placeholder="Your Name *" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                <input type="email" readOnly placeholder="Your Email *" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
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
  );
}
