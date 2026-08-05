import { useState, useRef, useEffect } from 'react';
import { useDashboard, type Message } from '../../context/DashboardContext';

export default function PlaygroundTab() {
  const { currentProject, activeProjectId, API_URL, fetchAnalytics } = useDashboard();

  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am BrainDesk AI. Ask me anything about this business.' }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isThinking, isStreaming]);

  const getBasename = (str: string) => {
    try {
      if (str.startsWith('http')) {
        const u = new URL(str);
        return u.hostname + u.pathname;
      }
      return str.split(/[\\/]/).pop() || str;
    } catch {
      return str;
    }
  };

  const handleSendQuestion = async () => {
    if (!inputQuestion.trim() || isThinking || isStreaming) return;
    const userMsg = inputQuestion.trim();
    setInputQuestion('');
    setPlaygroundMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Try streaming first, fall back to non-streaming
    try {
      setIsStreaming(true);
      // Add an empty assistant message that we'll stream into
      setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

      const res = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, widget_id: activeProjectId })
      });

      if (!res.ok || !res.body) {
        // Streaming endpoint not available — fall back to regular chat
        throw new Error('Streaming not available');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let sources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                fullAnswer += data.token;
                // Update the last assistant message with accumulated tokens
                setPlaygroundMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullAnswer,
                    sources
                  };
                  return updated;
                });
              }
              if (data.sources) {
                sources = data.sources;
              }
              if (data.done) {
                // Final update with sources
                setPlaygroundMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullAnswer,
                    sources: data.sources || sources
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      fetchAnalytics(activeProjectId);
    } catch {
      // Fallback to non-streaming /chat endpoint
      // Remove the empty streaming message first
      setPlaygroundMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });

      setIsStreaming(false);
      setIsThinking(true);

      try {
        const res = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMsg, widget_id: activeProjectId })
        });
        const data = await res.json();
        if (res.ok) {
          setPlaygroundMessages(prev => [...prev, {
            role: 'assistant',
            content: data.answer,
            sources: data.sources || []
          }]);
          fetchAnalytics(activeProjectId);
        } else {
          setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Error getting answer from BrainDesk AI.' }]);
        }
      } catch {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Ensure your FastAPI server is running.' }]);
      }
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  const isLoading = isThinking || isStreaming;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="header">
        <div>
          <h1>Live AI Sandbox Playground</h1>
          <p>Interact live with the AI model for <strong>{currentProject.name}</strong> with real-time vector search &amp; source citations.</p>
        </div>
      </div>

      <div className="playground-container glass-panel" style={{ flex: 1, minHeight: 0 }}>
        <div className="chat-messages-area">
          {playgroundMessages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
                {/* Streaming cursor */}
                {isStreaming && idx === playgroundMessages.length - 1 && msg.role === 'assistant' && (
                  <span className="streaming-cursor">▊</span>
                )}
              </div>

              {/* Source Citations Display */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Citations:</span>
                  {msg.sources.map((src, sIdx) => (
                    <span
                      key={sIdx}
                      title={src}
                      style={{
                        fontSize: '11px',
                        background: 'rgba(99,102,241,0.2)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(99,102,241,0.4)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {getBasename(src)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏳</span>
              BrainDesk AI is searching the knowledge base &amp; generating a response...
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="chat-input-bar">
          <input
            type="text"
            placeholder={`Ask a question about ${currentProject.name}...`}
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendQuestion()}
            disabled={isLoading}
          />
          <button className="btn-primary" onClick={handleSendQuestion} disabled={isLoading}>
            {isStreaming ? '🔴 Streaming...' : isThinking ? 'Thinking...' : 'Send 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
