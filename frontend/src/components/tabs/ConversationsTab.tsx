import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

interface ConversationSession {
  id: string;
  widget_id: string;
  timestamp: string;
  message_count: number;
  preview: string;
}

interface ConversationMessage {
  role: string;
  content: string;
  timestamp: string | null;
}

export default function ConversationsTab() {
  const { currentProject, activeProjectId, API_URL, getAuthHeaders, handleAuthError } = useDashboard();

  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch conversation sessions
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/conversations?widget_id=${activeProjectId}`, {
          headers: getAuthHeaders()
        });
        if (handleAuthError(res)) return;
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
          if (data.length > 0 && !selectedSession) {
            setSelectedSession(data[0].id);
          }
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, [activeProjectId, API_URL, getAuthHeaders, handleAuthError]);

  // Fetch messages for selected session
  useEffect(() => {
    if (!selectedSession) return;
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`${API_URL}/chat/history/${selectedSession}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedSession, API_URL]);

  const formatTime = (ts: string | null) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  const downloadChat = () => {
    if (messages.length === 0) return;
    const textContent = messages.map(msg => 
      `[${formatTime(msg.timestamp)}] ${msg.role === 'user' ? 'Visitor' : 'AI'}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_log_${selectedSession?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Conversation History</h1>
          <p>Browse past chat sessions with visitors for <strong>{currentProject.name}</strong>.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel section-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading conversation history...</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel section-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Conversations Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            When visitors chat with your AI widget, their conversation history will appear here. Try sending a message in the Playground first!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', minHeight: '500px' }}>
          {/* Session List */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
              🗂️ Sessions ({sessions.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: selectedSession === session.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    borderLeft: selectedSession === session.id ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTime(session.timestamp)}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-indigo)', fontWeight: 600 }}>
                      {session.message_count} msgs
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.preview || 'New conversation'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Thread */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '14px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💬 Conversation Thread</span>
              {selectedSession && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'monospace' }}>
                    {selectedSession.slice(0, 8)}...
                  </span>
                  <button 
                    onClick={downloadChat}
                    className="btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    title="Download Chat Log"
                  >
                    📥 Download
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Select a conversation to view messages.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user' ? 'var(--accent-indigo)' : 'var(--bg-tertiary)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                          color: '#fff',
                          fontSize: '13px',
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {msg.role === 'user' ? '👤 Visitor' : '🤖 AI'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        {msg.timestamp && (
                          <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                            {formatTime(msg.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
