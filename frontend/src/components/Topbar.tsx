import { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function Topbar() {
  const { currentProject, userRole, handleLogout } = useDashboard();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>🔍</span>
        <input type="text" placeholder={`Search ${currentProject.name}...`} />
      </div>
      <div className="topbar-actions">
        <button className="btn-secondary" style={{ padding: '8px 12px', lineHeight: 1 }}>🔔</button>
        
        <div className="profile-container" ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            className="topbar-avatar profile-avatar" 
            title={userRole === 'admin' ? 'Admin Account' : 'Client Account'}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: isProfileOpen ? '2px solid var(--accent-indigo)' : '2px solid transparent' }}
          >
            {userRole === 'admin' ? 'AD' : 'CL'}
          </div>

          {isProfileOpen && (
            <div className="profile-menu glass-panel animate-fade-in" style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '320px',
              padding: '0',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9999,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              {/* Profile Header */}
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                
                {/* Avatar with Change overlay */}
                <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }} className="avatar-wrapper">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`} 
                    alt="Profile Avatar" 
                    style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', fontSize: '10px', textAlign: 'center', fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                    Change Picture
                  </div>
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userEmail.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userEmail}
                  </div>
                  <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: userRole === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)', color: userRole === 'admin' ? 'var(--accent-indigo)' : 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {userRole} Account
                  </div>
                </div>
              </div>

              {/* Detailed Business Info */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Business Name</span>
                  <span style={{ color: 'white', fontWeight: 500 }}>{currentProject.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone Number</span>
                  <span style={{ color: 'white', fontWeight: 500 }}>{currentProject.phone_number || 'Not set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Support PIN</span>
                  <span style={{ color: 'white', fontWeight: 500, fontFamily: 'monospace' }}>8294</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }} 
                  onClick={() => setIsProfileOpen(false)}
                >
                  ⚙️ Edit Full Profile
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)', background: 'rgba(248, 113, 113, 0.05)' }} 
                  onClick={handleLogout}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
