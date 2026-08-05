import { useState, useCallback } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}

let toastIdCounter = 0;

/**
 * useToast — hook for managing stackable toast notifications.
 * Returns [toasts, showToast, ToastContainer].
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);

    // Start exit animation after 3.5s, remove after 4s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, 3500);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, showToast };
}

/**
 * ToastContainer — renders all active toast notifications.
 * Place once at the root of the dashboard.
 */
export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  const colorMap = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', accent: '#10b981' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', accent: '#ef4444' },
    info: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', accent: '#f97316' },
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const colors = colorMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`toast-item ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
            style={{
              background: colors.bg,
              borderLeft: `3px solid ${colors.accent}`,
              border: `1px solid ${colors.border}`,
              borderLeftWidth: '3px',
            }}
          >
            <span className="toast-icon">{iconMap[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
