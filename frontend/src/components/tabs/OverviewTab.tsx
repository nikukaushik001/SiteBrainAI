import { useDashboard } from '../../context/DashboardContext';

export default function OverviewTab() {
  const {
    currentProject, dbStats, analyticsData, leadsData, bookingsData,
    setActiveTab, setActiveTab: _setTab, userRole
  } = useDashboard();

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Managing AI support for <strong>{currentProject.name}</strong>.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: 'var(--accent-indigo)' }}>⚡</div>
          <div className="stat-info">
            <h4>AI Trained Data Points</h4>
            <div className="stat-value">{dbStats.total_chunks}</div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>📁</div>
          <div className="stat-info">
            <h4>Active Document Sources</h4>
            <div className="stat-value">{dbStats.documents?.length || 0}</div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>💬</div>
          <div className="stat-info">
            <h4>Total Questions Answered</h4>
            <div className="stat-value">{analyticsData.total_queries}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel section-panel">
        <div className="section-title">🚀 Quick Management</div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setActiveTab('playground')}>
            💬 Launch AI Playground
          </button>
          {userRole === 'admin' && (
            <>
              <button className="btn-secondary" onClick={() => setActiveTab('documents')}>
                📄 Manage Knowledge Base
              </button>
              <button className="btn-secondary" onClick={() => setActiveTab('widget')}>
                ⚙️ Get HTML Widget Snippet
              </button>
            </>
          )}
        </div>
      </div>

      {/* Setup Progress & Sentiment Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>

        {/* Setup Progress (Admin Only) */}
        {userRole === 'admin' && (
          <div className="glass-panel section-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-title">🚀 Getting Started</div>
            <p className="section-subtitle">Complete these steps to fully deploy your AI.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-emerald)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                <div style={{ flex: 1, fontSize: '14px', color: 'white' }}>Create your Project</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: dbStats.documents && dbStats.documents.length > 0 ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)', color: dbStats.documents && dbStats.documents.length > 0 ? 'white' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: dbStats.documents && dbStats.documents.length > 0 ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>{dbStats.documents && dbStats.documents.length > 0 ? '✓' : ''}</div>
                <div style={{ flex: 1, fontSize: '14px', color: dbStats.documents && dbStats.documents.length > 0 ? 'white' : 'var(--text-secondary)' }}>Upload Documents or Crawl Website</div>
                {!(dbStats.documents && dbStats.documents.length > 0) && <button onClick={() => setActiveTab('documents')} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--accent-indigo)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Go to Knowledge Base</button>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: analyticsData.total_queries > 0 ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)', color: analyticsData.total_queries > 0 ? 'white' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: analyticsData.total_queries > 0 ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>{analyticsData.total_queries > 0 ? '✓' : ''}</div>
                <div style={{ flex: 1, fontSize: '14px', color: analyticsData.total_queries > 0 ? 'white' : 'var(--text-secondary)' }}>Embed Widget & Test AI</div>
                {!(analyticsData.total_queries > 0) && <button onClick={() => setActiveTab('playground')} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--accent-indigo)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Test in Playground</button>}
              </div>
            </div>
          </div>
        )}

        {/* Sentiment Breakdown Mini */}
        <div className="glass-panel section-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-title">😊 Visitor Satisfaction</div>
          <p className="section-subtitle">Real-time sentiment pulse based on chat analysis.</p>

          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', marginBottom: 'auto' }}>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>😊</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{analyticsData.sentiment_breakdown?.Positive ?? 0}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>😐</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-indigo)' }}>{analyticsData.sentiment_breakdown?.Neutral ?? 0}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>😟</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f87171' }}>{analyticsData.sentiment_breakdown?.Negative ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversions */}
      <div className="glass-panel section-panel" style={{ marginTop: '24px' }}>
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎯 Recent Captured Visitors</span>
          <button className="btn-secondary" onClick={() => setActiveTab('analytics')} style={{ fontSize: '12px', padding: '4px 12px' }}>View All →</button>
        </div>

        {leadsData.length > 0 || bookingsData.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {[
              ...bookingsData.map(b => ({ ...b, type: 'booking', sortDate: new Date(b.created_at || 0) })),
              ...leadsData.map(l => ({ ...l, type: 'lead', sortDate: new Date(l.timestamp || 0) }))
            ]
              .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
              .slice(0, 5)
              .map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '20px' }}>{item.type === 'booking' ? '📅' : '👥'}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: item.type === 'booking' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)', color: item.type === 'booking' ? 'var(--accent-indigo)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                      {item.type === 'booking' ? 'Meeting Booked' : 'Visitor Captured'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '16px' }}>
            No leads or bookings captured yet. Once visitors interact with your AI and submit their details, they will appear here!
          </div>
        )}
      </div>
    </div>
  );
}
