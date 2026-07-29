import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Logo from '../components/Logo';
import '../App.css';

export default function LandingPage() {
  const navigate = useNavigate();

  // Inject the live widget for demo purposes
  useEffect(() => {
    // Only inject if it doesn't already exist to prevent duplicates in React StrictMode
    if (!document.getElementById('braindesk-demo-widget')) {
      const script = document.createElement('script');
      script.id = 'braindesk-demo-widget';
      script.src = 'http://127.0.0.1:8000/widget/sitebrain-widget.js';
      script.dataset.widgetId = 'default'; // Ensure you have a 'default' project or replace with your showcase project ID
      script.dataset.botName = 'BrainDesk AI (Demo)';
      script.dataset.color = '#06b6d4';
      script.dataset.greeting = 'Hi there! I am a live AI agent. Try asking me a question or say "Book a meeting" to see my autonomous capabilities! 🎙️';
      script.dataset.position = 'bottom-right';
      script.dataset.requireLead = 'false'; // Keep false so they can try it instantly without entering email
      script.dataset.starterPrompts = "What can you do?, Book a meeting, How does Voice AI work?";
      document.body.appendChild(script);
    }

    return () => {
      // Cleanup widget if user navigates away from landing page
      const script = document.getElementById('braindesk-demo-widget');
      if (script) document.body.removeChild(script);
      const widgetContainer = document.getElementById('sitebrain-widget-container');
      if (widgetContainer) document.body.removeChild(widgetContainer);
      const chatBtn = document.getElementById('sitebrain-chat-btn');
      if (chatBtn) document.body.removeChild(chatBtn);
    };
  }, []);

  return (
    <div className="landing-layout showcase-mode">
      {/* Navbar */}
      <nav className="landing-nav">
        <Logo onClick={() => navigate('/')} />
        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => navigate('/login')}>Client Login</button>
          <button className="btn-primary" onClick={() => window.location.href='mailto:hello@youragency.com'}>Book a Demo</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="aura-effect glow-cyan"></div>
          <div className="hero-badge pulsing-badge">⚡ Now with Voice AI & Autonomous Agents</div>
          <h1 className="hero-title showcase-title">Stop using dumb chatbots. <br/><span className="text-gradient">Hire an AI Employee.</span></h1>
          <p className="showcase-subtitle">We build and deploy ultra-premium AI Agents for your business that can actually <strong>talk to your customers</strong>, answer questions from your PDFs, and autonomously <strong>book meetings</strong>.</p>
          
          <div className="hero-buttons">
            <button className="btn-primary large animate-bounce" onClick={() => {
              const widgetBtn = document.getElementById('sitebrain-chat-btn');
              if(widgetBtn) widgetBtn.click();
            }}>
              Try the Live AI Demo Below ↘
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section showcase-features">
        <h2 style={{ fontSize: '36px', marginBottom: '40px', fontWeight: 800 }}>Features that blow competitors away.</h2>
        <div className="features-grid">
          
          <div className="feature-card glass-panel premium-card">
            <div className="feature-icon glowing-icon">🎙️</div>
            <h3>Native Voice AI</h3>
            <p>Your customers don't have to type. They can click the microphone and literally <strong>talk</strong> to the widget, and the AI will speak back.</p>
          </div>

          <div className="feature-card glass-panel premium-card">
            <div className="feature-icon glowing-icon">📅</div>
            <h3>Autonomous Agents</h3>
            <p>Not just an FAQ bot. The AI understands intent, collects customer data, and can actively <strong>book meetings</strong> directly into your dashboard.</p>
          </div>
          
          <div className="feature-card glass-panel premium-card">
            <div className="feature-icon glowing-icon">🧠</div>
            <h3>Knowledge Base Sync</h3>
            <p>We train the AI on your entire website and PDF documents so it knows your business perfectly, resolving 80% of support tickets instantly.</p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Logo style={{ justifyContent: 'center', marginBottom: '20px' }} />
        <p>&copy; {new Date().getFullYear()} AI Agency Showcase. All rights reserved.</p>
      </footer>
    </div>
  );
}
