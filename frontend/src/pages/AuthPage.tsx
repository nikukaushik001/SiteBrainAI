import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import '../App.css';

const API_URL = 'http://127.0.0.1:8000';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT token — this is the single source of truth for auth
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', data.email);
        // Remove legacy flag to avoid confusion
        localStorage.removeItem('isAuthenticated');
        navigate('/dashboard');
      } else {
        setError(data.detail || (isLogin ? 'Login failed. Check your credentials.' : 'Registration failed.'));
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container glass-panel">
        <Logo onClick={() => navigate('/')} style={{ justifyContent: 'center', marginBottom: '22px' }} />

        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin
            ? 'Sign in to manage your AI agents.'
            : 'Start your 14-day free trial. No credit card required.'}
        </p>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '8px',
            padding: '11px 14px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@company.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '13px', opacity: isLoading ? 0.7 : 1 }}
            disabled={isLoading}
          >
            {isLoading
              ? '⏳ Processing...'
              : isLogin
                ? 'Sign In →'
                : 'Create Account →'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <span onClick={() => navigate('/contact-admin')} className="auth-link" style={{ cursor: 'pointer', color: 'var(--accent-orange)' }}>
                Contact Admin
              </span>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <span onClick={() => { navigate('/login'); setError(''); }} className="auth-link">
                Sign in
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
