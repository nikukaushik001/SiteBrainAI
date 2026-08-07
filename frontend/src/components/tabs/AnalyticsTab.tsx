import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsTab() {
  const {
    currentProject, activeProjectId, API_URL, analyticsData, leadsData, bookingsData,
    getAuthHeaders, handleAuthError, fetchAnalytics, showToast
  } = useDashboard();

  const [analyticsSubTab, setAnalyticsSubTab] = useState<'intelligence' | 'leads' | 'bookings'>('intelligence');
  const [isGeneratingFaq, setIsGeneratingFaq] = useState(false);
  const [faqResult, setFaqResult] = useState('');

  const handleGenerateFAQ = async () => {
    setIsGeneratingFaq(true);
    setFaqResult('');
    try {
      const res = await fetch(`${API_URL}/analytics/generate-faq?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        setFaqResult(data.faq);
        showToast('FAQ generated successfully!', 'success');
      } else {
        showToast(data.detail || 'Failed to generate FAQ.', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsGeneratingFaq(false);
    }
  };

  const handleClearAnalytics = async () => {
    if (!window.confirm(`Clear query analytics logs for '${currentProject.name}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/analytics/clear?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      fetchAnalytics(activeProjectId);
      showToast('Analytics logs cleared.', 'success');
    } catch {
      showToast('Error clearing analytics logs.', 'error');
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('token') || '';
    window.open(`${API_URL}/analytics/export?widget_id=${activeProjectId}&token=${token}`, '_blank');
  };

  const sentimentData = [
    { name: 'Positive', value: analyticsData.sentiment_breakdown?.Positive ?? 0, color: '#10b981' },
    { name: 'Neutral', value: analyticsData.sentiment_breakdown?.Neutral ?? 0, color: '#6366f1' },
    { name: 'Negative', value: analyticsData.sentiment_breakdown?.Negative ?? 0, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Analytics &amp; Intelligence</h1>
          <p>Track conversation performance, missing answers, &amp; captured visitors for <strong>{currentProject.name}</strong>.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={handleGenerateFAQ} disabled={isGeneratingFaq}>
            {isGeneratingFaq ? 'Generating...' : '🤖 Generate FAQ'}
          </button>
          <button className="btn-secondary" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="btn-danger" onClick={handleClearAnalytics}>
            🧹 Clear Logs
          </button>
        </div>
      </div>

      {faqResult && (
        <div className="glass-panel section-panel" style={{ marginBottom: '20px' }}>
          <div className="section-title">
            <span>🤖</span> AI-Generated FAQ
            <button className="btn-secondary" onClick={() => setFaqResult('')} style={{ float: 'right', padding: '4px 10px', fontSize: '12px' }}>Close</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
            {faqResult}
          </pre>
        </div>
      )}

      {/* Analytics Sub-Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className={`btn-secondary ${analyticsSubTab === 'intelligence' ? 'active-tab-btn' : ''}`}
          style={{ background: analyticsSubTab === 'intelligence' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
          onClick={() => setAnalyticsSubTab('intelligence')}
        >
          💡 Chat Logs
        </button>
        <button
          className={`btn-secondary ${analyticsSubTab === 'leads' ? 'active-tab-btn' : ''}`}
          style={{ background: analyticsSubTab === 'leads' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
          onClick={() => setAnalyticsSubTab('leads')}
        >
          👥 Captured Visitors ({leadsData.length})
        </button>
        <button
          className={`btn-secondary ${analyticsSubTab === 'bookings' ? 'active-tab-btn' : ''}`}
          style={{ background: analyticsSubTab === 'bookings' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)', color: '#fff' }}
          onClick={() => setAnalyticsSubTab('bookings')}
        >
          📅 Meetings Booked ({bookingsData.length})
        </button>
      </div>

      {analyticsSubTab === 'intelligence' && (
        <>
          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ color: '#f59e0b' }}>💬</div>
              <div className="stat-info">
                <h4>Total Questions</h4>
                <div className="stat-value">{analyticsData.total_queries}</div>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ color: '#10b981' }}>🎯</div>
              <div className="stat-info">
                <h4>Resolution Rate</h4>
                <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
                  {analyticsData.resolution_rate_pct}%
                </div>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ color: '#ec4899' }}>⚠️</div>
              <div className="stat-info">
                <h4>Unanswered Questions</h4>
                <div className="stat-value" style={{ color: '#f472b6' }}>
                  {analyticsData.total_unanswered}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '22px' }}>
            {/* Volume Over Time Chart */}
            <div className="glass-panel section-panel">
              <div className="section-title"><span>📈</span> Chat Volume (Last 7 Days)</div>
              {analyticsData.volume_by_day && analyticsData.volume_by_day.length > 0 ? (
                <div style={{ width: '100%', height: 250, marginTop: '20px' }}>
                  <ResponsiveContainer>
                    <AreaChart data={analyticsData.volume_by_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUnanswered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)', color: '#fff', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="queries" name="Total Queries" stroke="#6366f1" fillOpacity={1} fill="url(#colorQueries)" />
                      <Area type="monotone" dataKey="unanswered" name="Unanswered" stroke="#ec4899" fillOpacity={1} fill="url(#colorUnanswered)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Not enough data for volume chart.
                </div>
              )}
            </div>

            {/* Satisfaction Breakdown Chart */}
            <div className="glass-panel section-panel">
              <div className="section-title"><span>😊</span> Visitor Satisfaction Analysis</div>
              {sentimentData.length > 0 ? (
                <div style={{ width: '100%', height: 250, marginTop: '20px', display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No sentiment data available.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel section-panel" style={{ marginBottom: '22px' }}>
            <div className="section-title"><span>💡</span> Unanswered Questions Intelligence</div>
            <p className="section-subtitle">
              These are questions where the AI replied "I don't have that information". Update your PDFs to include these missing details!
            </p>

            {analyticsData.top_unanswered?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analyticsData.top_unanswered.map((item, idx) => (
                  <div key={idx} className="unanswered-item">
                    <div className="unanswered-question">❓ "{item.question}"</div>
                    <div className="unanswered-count">Asked {item.count} time{item.count > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="success-state">
                🎉 Great job! No unanswered customer questions flagged for {currentProject.name}.
              </div>
            )}
          </div>

          {/* Conversation Log Feed */}
          <div className="glass-panel section-panel">
            <div className="section-title">📜 Recent Conversation Logs</div>

            {analyticsData.recent_logs?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {analyticsData.recent_logs.map(log => (
                  <div key={log.id} className="log-entry">
                    <div className="log-header">
                      <span className="log-timestamp">{log.timestamp}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {log.is_unanswered ? (
                          <span className="log-status-badge" style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>⚠️ Unanswered</span>
                        ) : (
                          <span className="log-status-badge" style={{ background: 'rgba(16,185,129,0.18)', color: 'var(--accent-emerald)' }}>✅ Answered</span>
                        )}
                        {log.sentiment === 'Positive' && (
                          <span className="log-status-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>😊 Positive</span>
                        )}
                        {log.sentiment === 'Negative' && (
                          <span className="log-status-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>😟 Negative</span>
                        )}
                      </div>
                    </div>
                    <div className="log-question">Q: {log.question}</div>
                    <div className="log-answer">A: {log.answer}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No customer conversations logged for {currentProject.name} yet. Ask a question in the Playground to see logs appear here live!
              </div>
            )}
          </div>
        </>
      )}

      {analyticsSubTab === 'leads' && (
        <div className="glass-panel section-panel">
          <div className="section-title">👥 Captured Visitor Leads ({currentProject.name})</div>
          <p className="section-subtitle">Visitors who submitted their name &amp; email prior to asking questions in your widget.</p>

          {leadsData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Date/Time</th>
                    <th style={{ padding: '10px' }}>Visitor Name</th>
                    <th style={{ padding: '10px' }}>Email Address</th>
                    <th style={{ padding: '10px' }}>Widget Tenant ID</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{lead.timestamp}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{lead.name}</td>
                      <td style={{ padding: '10px', color: 'var(--accent-cyan)' }}>{lead.email}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}><code>{lead.widget_id}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No visitor leads captured yet for <strong>{currentProject.name}</strong>. Enable "Require Lead Info" in Widget Studio to start capturing visitor emails!
            </div>
          )}
        </div>
      )}

      {analyticsSubTab === 'bookings' && (
        <div className="glass-panel section-panel">
          <div className="section-title">📅 AI Agent Bookings ({currentProject.name})</div>
          <p className="section-subtitle">Meetings and appointments autonomously booked by the AI Agent.</p>

          {bookingsData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Booked For</th>
                    <th style={{ padding: '10px' }}>Customer Name</th>
                    <th style={{ padding: '10px' }}>Email Address</th>
                    <th style={{ padding: '10px' }}>Notes</th>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsData.map((booking: any) => (
                    <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                      <td style={{ padding: '10px', color: 'var(--accent-indigo)', fontWeight: 600 }}>{booking.booking_time}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{booking.customer_name}</td>
                      <td style={{ padding: '10px', color: 'var(--accent-cyan)' }}>{booking.customer_email}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{booking.notes}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{booking.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No bookings captured yet for <strong>{currentProject.name}</strong>. Tell your AI Assistant to "book a meeting" in the system prompt.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
