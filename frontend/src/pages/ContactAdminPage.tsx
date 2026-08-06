import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import '../App.css';

export default function ContactAdminPage() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setError('Failed to submit request. Please try again.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container glass-panel" style={{ textAlign: 'center' }}>
        <Logo onClick={() => navigate('/')} style={{ justifyContent: 'center', marginBottom: '22px' }} />

        <h2>Request Access</h2>
        <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
          Accounts are currently managed by invitation only. 
          Please submit a request to set up a new project workspace.
        </p>

        {isSubmitted ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--accent-emerald)' }}>✅ Request Received</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Thank you! We've received your request and will review it shortly. We'll contact you at <strong>{email}</strong> once your workspace is ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginBottom: '24px' }}>
            {error && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Your Name</label>
              <input 
                type="text" 
                required 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', padding: '12px', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <button 
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
}
