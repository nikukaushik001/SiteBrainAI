import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-layout">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="logo-container">
          <div className="logo-icon">✨</div>
          <div className="logo-text">DocsAuraAI</div>
        </div>
        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="aura-effect"></div>
          <h1>Turn Your Website & Docs into an <span className="text-gradient">AI Support Agent</span> in Minutes</h1>
          <p>Instantly crawl your website, upload your PDFs, and deploy a 24/7 intelligent RAG chatbot to your site. Zero coding required.</p>
          <div className="hero-buttons">
            <button className="btn-primary large" onClick={() => navigate('/signup')}>Start Your Free Trial</button>
            <button className="btn-secondary large" onClick={() => navigate('/login')}>See How It Works</button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section">
        <h2>Everything you need to automate support</h2>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon">🌐</div>
            <h3>Smart Web Crawler</h3>
            <p>Paste your website URL (including SPAs like React/Next.js) and we'll automatically scrape and index your content.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon">📄</div>
            <h3>PDF Knowledge Base</h3>
            <p>Upload employee handbooks, pricing guides, or FAQs. The AI learns everything instantly.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon">📈</div>
            <h3>Unanswered Intelligence</h3>
            <p>Analytics automatically tracks questions the AI couldn't answer, telling you exactly what to add to your docs.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '20px' }}>
          <div className="logo-icon">✨</div>
          <div className="logo-text">DocsAuraAI</div>
        </div>
        <p>&copy; {new Date().getFullYear()} DocsAuraAI SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
