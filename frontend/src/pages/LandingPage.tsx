import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Logo from '../components/Logo';
import { API_URL } from '../config';
import '../App.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const statsRef = useRef<HTMLDivElement>(null);

  // Intersection observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Inject the live widget for demo
  useEffect(() => {
    if (!document.getElementById('braindesk-demo-widget')) {
      const script = document.createElement('script');
      script.id = 'braindesk-demo-widget';
      script.src = `/sitebrain-widget.js?v=${Date.now()}`;
      script.dataset.widgetId = 'default';
      script.dataset.botName = 'BrainDesk AI';
      script.dataset.color = '#ef4444';
      script.dataset.greeting = "Hey! 👋 I'm BrainDesk AI — a live demo of what your business could have. Ask me anything about our product, or try the 🎙️ mic button to talk to me!";
      script.dataset.position = 'bottom-right';
      script.dataset.requireLead = 'false';
      script.dataset.starterPrompts = "What is BrainDesk AI?, How does Voice AI work?";
      document.body.appendChild(script);
    }
    return () => {
      const script = document.getElementById('braindesk-demo-widget');
      if (script) document.body.removeChild(script);
      const wc = document.getElementById('sitebrain-widget-container');
      if (wc) document.body.removeChild(wc);
    };
  }, []);

  // Helper to open widget safely
  const openWidget = () => {
    const tryClick = (retries = 0) => {
      const widgetBtn = document.getElementById('sitebrain-chat-btn');
      if (widgetBtn) {
        widgetBtn.click();
      } else if (retries < 10) {
        // Retry every 200ms up to 2 seconds if widget is still loading
        setTimeout(() => tryClick(retries + 1), 200);
      } else {
        alert("The AI demo is still loading. Please try again in a few seconds.");
      }
    };
    tryClick();
  };

  // Animated counter
  const AnimatedCounter = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (!visibleSections.has('stats')) return;
      let start = 0;
      const duration = 2000;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [visibleSections, end]);

    return <span ref={ref}>{count}{suffix}</span>;
  };

  return (
    <div className="lp">
      {/* Animated background mesh */}
      <div className="lp-bg-mesh">
        <div className="lp-orb lp-orb-1"></div>
        <div className="lp-orb lp-orb-2"></div>
        <div className="lp-orb lp-orb-3"></div>
        <div className="lp-grid-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="lp-nav">
        <Logo onClick={() => navigate('/')} />
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How It Works</a>
          <a href="#stats" className="lp-nav-link">Results</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Log In</button>
          <button className="lp-btn-primary" onClick={openWidget}>
            Try Live Demo
            <span className="lp-btn-glow"></span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot"></span>
            Voice AI &bull; Autonomous Agents &bull; RAG Knowledge Base
          </div>

          <h1 className="lp-hero-title">
            Your website deserves<br />
            <span className="lp-gradient-text">an AI employee.</span>
          </h1>

          <p className="lp-hero-desc">
            Deploy an intelligent AI agent that reads your docs, talks to your visitors with a real voice, 
            and books meetings on autopilot. Not a chatbot — an <em>autonomous team member</em>.
          </p>

          <div className="lp-hero-cta">
            <button className="lp-btn-primary lp-btn-lg" onClick={openWidget}>
              <span className="lp-btn-icon">⚡</span>
              Try the AI Now — It's Live
              <span className="lp-btn-glow"></span>
            </button>
            <button className="lp-btn-outline lp-btn-lg" onClick={() => navigate('/login')}>
              Go to Dashboard →
            </button>
          </div>

          <p className="lp-hero-hint">↘ Click the chat bubble in the bottom-right corner to talk to it</p>
        </div>

        {/* Floating feature tags */}
        <div className="lp-floating-tags">
          <span className="lp-ftag lp-ftag-1">🎙️ Voice</span>
          <span className="lp-ftag lp-ftag-2">📅 Booking</span>
          <span className="lp-ftag lp-ftag-3">🧠 RAG</span>
          <span className="lp-ftag lp-ftag-4">📊 Analytics</span>
          <span className="lp-ftag lp-ftag-5">🔗 Webhooks</span>
        </div>
      </section>

      {/* Trusted By */}
      <section className="lp-social-proof">
        <p className="lp-sp-label">TRUSTED BY FORWARD-THINKING TEAMS</p>
        <div className="lp-sp-logos">
          <span>HireLoop AI</span>
          <span>TechNova</span>
          <span>NexusCorp</span>
          <span>CloudSpark</span>
          <span>DataHive</span>
        </div>
      </section>

      {/* Features */}
      <section className="lp-features" id="features" data-animate>
        <div className={`lp-section-inner ${visibleSections.has('features') ? 'lp-visible' : ''}`}>
          <div className="lp-section-header">
            <span className="lp-section-tag">CAPABILITIES</span>
            <h2>Everything your business needs.<br />Nothing it doesn't.</h2>
            <p>Three killer features that make BrainDesk AI leagues ahead of any chatbot builder.</p>
          </div>

          <div className="lp-features-grid">
            <div className="lp-fcard">
              <div className="lp-fcard-icon lp-fcard-voice">
                <span>🎙️</span>
              </div>
              <h3>Native Voice AI</h3>
              <p>Visitors click the mic and <strong>speak</strong>. The AI listens, understands, and replies with a natural voice — no typing required. Powered by native browser Speech APIs.</p>
              <div className="lp-fcard-tag">Zero API Cost</div>
            </div>

            <div className="lp-fcard lp-fcard-featured">
              <div className="lp-fcard-ribbon">★ KILLER FEATURE</div>
              <div className="lp-fcard-icon lp-fcard-agent">
                <span>📅</span>
              </div>
              <h3>Autonomous Booking Agent</h3>
              <p>Say "Book a meeting for tomorrow at 3pm" and the AI <strong>actually schedules it</strong>. It extracts names, emails, times, and saves them to your dashboard. No human involved.</p>
              <div className="lp-fcard-tag">AI Tool Calling</div>
            </div>

            <div className="lp-fcard">
              <div className="lp-fcard-icon lp-fcard-brain">
                <span>🧠</span>
              </div>
              <h3>RAG Knowledge Base</h3>
              <p>Upload PDFs, DOCX, TXT, CSV or crawl entire websites. The AI learns everything and answers visitors with <strong>cited sources</strong>.</p>
              <div className="lp-fcard-tag">Multi-Format</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="lp-how" id="how-it-works" data-animate>
        <div className={`lp-section-inner ${visibleSections.has('how-it-works') ? 'lp-visible' : ''}`}>
          <div className="lp-section-header">
            <span className="lp-section-tag">HOW IT WORKS</span>
            <h2>Three steps. Five minutes.<br />Your AI is live.</h2>
          </div>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <h3>Upload Your Knowledge</h3>
              <p>Drop your PDFs, paste your website URL, or upload any document. We handle the rest — chunking, embedding, indexing.</p>
            </div>
            <div className="lp-step-connector"></div>
            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <h3>Customize Your Agent</h3>
              <p>Set the personality, brand colors, greeting message, system prompt. Enable Voice AI and autonomous booking with one click.</p>
            </div>
            <div className="lp-step-connector"></div>
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <h3>Embed & Go Live</h3>
              <p>Copy one line of code. Paste it on your website. Your AI agent is now live, 24/7, answering questions and booking meetings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="lp-stats" id="stats" data-animate ref={statsRef}>
        <div className={`lp-section-inner ${visibleSections.has('stats') ? 'lp-visible' : ''}`}>
          <div className="lp-stats-grid">
            <div className="lp-stat">
              <div className="lp-stat-value"><AnimatedCounter end={80} suffix="%" /></div>
              <div className="lp-stat-label">Ticket Resolution Rate</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-value"><AnimatedCounter end={24} />/7</div>
              <div className="lp-stat-label">Always-On Availability</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-value">&lt;<AnimatedCounter end={5} />min</div>
              <div className="lp-stat-label">Setup Time</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-value">$<AnimatedCounter end={0} /></div>
              <div className="lp-stat-label">Voice AI Infrastructure Cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final-cta" data-animate id="cta">
        <div className={`lp-section-inner ${visibleSections.has('cta') ? 'lp-visible' : ''}`}>
          <div className="lp-cta-glow"></div>
          <h2>Ready to hire your AI employee?</h2>
          <p>Stop losing customers to slow response times. Deploy an intelligent agent today.</p>
          <div className="lp-hero-cta">
            <button className="lp-btn-primary lp-btn-lg" onClick={openWidget}>
              <span className="lp-btn-icon">💬</span>
              Talk to the AI Now
              <span className="lp-btn-glow"></span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Logo style={{ justifyContent: 'center', marginBottom: '16px' }} />
          <p>&copy; {new Date().getFullYear()} BrainDesk AI. Built with Gemini &amp; Groq.</p>
        </div>
      </footer>
    </div>
  );
}
