import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export default function IntegrationTab() {
  const { activeProjectId, currentProject, API_URL, showToast } = useDashboard();

  const [integrationTab, setIntegrationTab] = useState<'html' | 'react' | 'nextjs'>('html');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Code copied to clipboard!', 'success');
  };

  // Use widget customizer defaults for code generation
  const botName = 'BrainDesk Assistant';
  const primaryColor = currentProject?.theme_color || '#ef4444';
  const greetingMsg = 'Hi! Welcome to our site. How can I help you today?';
  const position = 'bottom-right';
  const requireLead = 'false';
  const fontFamily = currentProject?.font_family || 'Inter, sans-serif';
  const botAvatarUrl = currentProject?.bot_avatar_url || '';
  const proactiveMessage = currentProject?.proactive_message || '';

  const htmlSnippet = `<!-- Paste your BrainDesk AI snippet here -->\n<script\n  src="${API_URL}/static/sitebrain-widget.js"\n  data-widget-id="${activeProjectId}"\n  data-bot-name="${botName}"\n  data-color="${primaryColor}"\n  data-greeting="${greetingMsg}"\n  data-position="${position}"\n  data-require-lead="${requireLead}"\n  data-font-family="${fontFamily}"\n  data-bot-avatar-url="${botAvatarUrl}"\n  data-proactive-message="${proactiveMessage}">\n</script>\n</body>\n</html>`;

  const reactSnippet = `import { useEffect } from 'react';\n\nexport default function App() {\n  useEffect(() => {\n    const script = document.createElement('script');\n    script.src = "${API_URL}/static/sitebrain-widget.js";\n    script.dataset.widgetId = "${activeProjectId}";\n    script.dataset.botName = "${botName}";\n    script.dataset.color = "${primaryColor}";\n    script.dataset.position = "${position}";\n    script.dataset.requireLead = "${requireLead}";\n    script.dataset.greeting = "${greetingMsg}";\n    script.dataset.fontFamily = "${fontFamily}";\n    script.dataset.botAvatarUrl = "${botAvatarUrl}";\n    script.dataset.proactiveMessage = "${proactiveMessage}";\n    script.async = true;\n    document.body.appendChild(script);\n\n    return () => {\n      // Cleanup if needed (optional)\n      // document.body.removeChild(script);\n    };\n  }, []);\n\n  return (\n    <div>\n      {/* Your app content */}\n    </div>\n  );\n}`;

  const nextjsSnippet = `import Script from 'next/script';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        \n        {/* BrainDesk AI Widget */}\n        <Script\n          src="${API_URL}/static/sitebrain-widget.js"\n          strategy="lazyOnload"\n          data-widget-id="${activeProjectId}"\n          data-bot-name="${botName}"\n          data-color="${primaryColor}"\n          data-greeting="${greetingMsg}"\n          data-position="${position}"\n          data-require-lead="${requireLead}"\n          data-font-family="${fontFamily}"\n          data-bot-avatar-url="${botAvatarUrl}"\n          data-proactive-message="${proactiveMessage}"\n        />\n      </body>\n    </html>\n  );\n}`;

  return (
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
            <div style={{ position: 'relative' }}>
              <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                {htmlSnippet}
              </div>
              <button 
                onClick={() => copyToClipboard(htmlSnippet)}
                className="btn-primary"
                style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px', fontSize: '12px' }}
              >
                Copy Code
              </button>
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
            <div style={{ position: 'relative' }}>
              <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                {reactSnippet}
              </div>
              <button 
                onClick={() => copyToClipboard(reactSnippet)}
                className="btn-primary"
                style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px', fontSize: '12px' }}
              >
                Copy Code
              </button>
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
            <div style={{ position: 'relative' }}>
              <div className="code-box" style={{ background: '#111827', color: '#e5e7eb', padding: '16px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre', overflowX: 'auto' }}>
                {nextjsSnippet}
              </div>
              <button 
                onClick={() => copyToClipboard(nextjsSnippet)}
                className="btn-primary"
                style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px', fontSize: '12px' }}
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
