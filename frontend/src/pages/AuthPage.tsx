import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../App.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth network request
    setTimeout(() => {
      setIsLoading(false);
      // In a real app, we'd save the token here.
      // For now, just navigate to the dashboard!
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="auth-layout">
      <div className="auth-container glass-panel">
        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <div className="logo-icon">✨</div>
          <div className="logo-text">DocsAuraAI</div>
        </div>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', textAlign: 'center' }}>
          {isLogin ? 'Sign in to manage your AI agents.' : 'Start your 14-day free trial. No credit card required.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }} disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? (
            <p>Don't have an account? <span onClick={() => navigate('/signup')} className="auth-link">Sign up</span></p>
          ) : (
            <p>Already have an account? <span onClick={() => navigate('/login')} className="auth-link">Sign in</span></p>
          )}
        </div>
      </div>
    </div>
  );
}
