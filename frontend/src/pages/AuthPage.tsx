import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import '../App.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      setIsLoading(false);
      
      if (response.ok) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('token', data.access_token);
        navigate('/dashboard');
      } else {
        alert(data.detail || "Login failed");
      }
    } catch (err) {
      setIsLoading(false);
      alert("Error connecting to server.");
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container glass-panel">
        <Logo onClick={() => navigate('/')} style={{ justifyContent: 'center', marginBottom: '24px' }} />
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', textAlign: 'center' }}>
          {isLogin ? 'Sign in to manage your AI agents.' : 'Start your 14-day free trial. No credit card required.'}
          <br/>
          <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
            <strong>Demo:</strong> Type 'admin' in email for Platform Admin access.
          </span>
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
