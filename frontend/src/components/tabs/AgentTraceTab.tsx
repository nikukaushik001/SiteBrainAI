import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';

interface TraceEvent {
  ts: string;
  step: 'RETRIEVAL' | 'TOOL_CALL' | 'ESCALATION' | 'GENERATION';
  detail: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

const STEP_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  RETRIEVAL:  { icon: '🔍', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'RETRIEVAL'  },
  TOOL_CALL:  { icon: '🔧', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', label: 'TOOL CALL'  },
  ESCALATION: { icon: '🚨', color: '#f97316', bg: 'rgba(249,115,22,0.08)',  label: 'ESCALATION' },
  GENERATION: { icon: '✨', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'GENERATION' },
};

const STATUS_COLOR: Record<string, string> = {
  info:    '#6366f1',
  success: '#10b981',
  warning: '#f97316',
  error:   '#ef4444',
};

export default function AgentTraceTab() {
  const { activeProjectId, API_URL, getAuthHeaders, handleAuthError } = useDashboard();
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [traceCount, setTraceCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTraces = async () => {
    try {
      const res = await fetch(`${API_URL}/api/agent-trace?widget_id=${activeProjectId}`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
        setTraceCount(data.trace_count || 0);
      }
    } catch {
      // silently ignore network errors for polling
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTraces().finally(() => setLoading(false));
  }, [activeProjectId]);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(fetchTraces, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, activeProjectId]);

  useEffect(() => {
    if (isLive) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [traces]);

  const cfg = (step: string) => STEP_CONFIG[step] || STEP_CONFIG['GENERATION'];

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>🤖 Agent Reasoning Trace</h1>
          <p>Live step-by-step view of how the AI agent retrieves, reasons, and uses tools.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className={isLive ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setIsLive(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#10b981' : '#737373', display: 'inline-block', animation: isLive ? 'pulse 1.5s infinite' : 'none' }} />
            {isLive ? 'Live (auto-refresh 3s)' : 'Paused'}
          </button>
          <button className="btn-secondary" onClick={fetchTraces}>↻ Refresh</button>
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel" style={{ marginBottom: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '14px 20px' }}>
        {Object.values(STEP_CONFIG).map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '14px' }}>{c.icon}</span>
            <span style={{ color: c.color, fontWeight: 600 }}>{c.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px' }}>
          {traceCount} total events (last 50 shown)
        </div>
      </div>

      {/* Terminal panel */}
      <div
        className="glass-panel"
        style={{
          background: 'rgba(8,8,8,0.85)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-md)',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '13px',
          minHeight: '420px',
          maxHeight: '600px',
          overflowY: 'auto',
          padding: '20px',
          position: 'relative',
        }}
      >
        {/* Terminal header bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ marginLeft: '12px', color: '#555', fontSize: '11px', letterSpacing: '1px' }}>
            SITEBRAIN-AI / AGENT-TRACE / {activeProjectId}
          </span>
          {isLive && (
            <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              LIVE
            </span>
          )}
        </div>

        {loading && traces.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div>Loading trace events...</div>
          </div>
        )}

        {!loading && traces.length === 0 && (
          <div style={{ color: '#444', textAlign: 'center', marginTop: '60px', lineHeight: '1.8' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>💤</div>
            <div style={{ color: '#555', fontWeight: 600 }}>Awaiting agent activity...</div>
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#333' }}>
              Send a message via the widget or Playground tab to see live reasoning steps here.
            </div>
          </div>
        )}

        {traces.map((event, i) => {
          const c = cfg(event.step);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '6px',
                background: c.bg,
                border: `1px solid ${c.color}22`,
                alignItems: 'flex-start',
                animation: 'fadeSlideIn 0.3s ease',
              }}
            >
              {/* Timestamp */}
              <span style={{ color: '#444', fontSize: '11px', whiteSpace: 'nowrap', marginTop: '2px', minWidth: '60px' }}>
                {event.ts}
              </span>
              {/* Step badge */}
              <span style={{
                background: c.color + '22',
                color: c.color,
                border: `1px solid ${c.color}55`,
                borderRadius: '4px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                marginTop: '2px',
              }}>
                {c.icon} {c.label}
              </span>
              {/* Status dot */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: STATUS_COLOR[event.status] || '#6366f1',
                marginTop: '6px', flexShrink: 0
              }} />
              {/* Detail */}
              <span style={{ color: '#c8c8c8', lineHeight: '1.5', flex: 1, wordBreak: 'break-word' }}>
                {event.detail}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
