import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { useToast, ToastContainer } from '../components/Toast';

// ── Shared Type Definitions ──────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface Project {
  id: string;
  name: string;
  system_prompt?: string;
  starter_prompts?: string;
  webhook_url?: string;
  allowed_domains?: string;
  phone_number?: string;
  support_email?: string;
  operating_hours?: string;
  ai_persona?: string;
}

export interface AnalyticsLog {
  id: string;
  question: string;
  answer: string;
  is_unanswered: boolean;
  sentiment: string;
  timestamp: string;
}

export interface AnalyticsData {
  total_queries: number;
  total_answered: number;
  total_unanswered: number;
  resolution_rate_pct: number;
  top_unanswered: { question: string; count: number }[];
  sentiment_breakdown?: { Positive: number; Neutral: number; Negative: number };
  recent_logs: AnalyticsLog[];
}

export interface DetailedDoc {
  source: string;
  chunks: number;
  type: string;
  title?: string;
}

export interface Lead {
  id: number;
  widget_id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  timestamp: string;
}

export interface DbStats {
  total_chunks: number;
  documents?: string[];
  detailed_documents?: DetailedDoc[];
  status: string;
}

export type TabType = 'overview' | 'playground' | 'documents' | 'analytics' | 'widget' | 'integration' | 'conversations' | 'clients' | 'profile' | 'billing';

// ── Context Shape ────────────────────────────────────────────────────────────

interface DashboardContextType {
  // Auth & API
  API_URL: string;
  getAuthHeaders: () => Record<string, string>;
  handleAuthError: (res: Response) => boolean;
  userRole: string;

  // Projects
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  activeProjectId: string;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string>>;
  currentProject: Project;

  // Navigation
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;

  // Data
  dbStats: DbStats;
  setDbStats: React.Dispatch<React.SetStateAction<DbStats>>;
  analyticsData: AnalyticsData;
  setAnalyticsData: React.Dispatch<React.SetStateAction<AnalyticsData>>;
  leadsData: Lead[];
  setLeadsData: React.Dispatch<React.SetStateAction<Lead[]>>;
  bookingsData: any[];
  setBookingsData: React.Dispatch<React.SetStateAction<any[]>>;

  // Data fetchers
  fetchProjects: () => Promise<void>;
  fetchStats: (widgetId: string) => Promise<void>;
  fetchAnalytics: (widgetId: string) => Promise<void>;
  fetchLeads: (widgetId: string) => Promise<void>;
  fetchBookings: (widgetId: string) => Promise<void>;

  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Logout
  handleLogout: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  // ── Auth helpers ──
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  const handleAuthError = useCallback((res: Response): boolean => {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/');
  }, [navigate]);

  // ── State ──
  const [userRole, setUserRole] = useState('client');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem('braindesk_active_project') || 'default_workspace';
    } catch {
      return 'default_workspace';
    }
  });

  const [dbStats, setDbStats] = useState<DbStats>({
    total_chunks: 0, documents: [], detailed_documents: [], status: 'connecting'
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_queries: 0, total_answered: 0, total_unanswered: 0,
    resolution_rate_pct: 100, top_unanswered: [], recent_logs: [],
    sentiment_breakdown: { Positive: 0, Neutral: 0, Negative: 0 }
  });
  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [bookingsData, setBookingsData] = useState<any[]>([]);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0] || { id: activeProjectId, name: 'Loading...' };

  // ── Load role ──
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'client';
    setUserRole(role);
  }, []);

  // ── Persist project selection ──
  useEffect(() => {
    try {
      localStorage.setItem('braindesk_projects', JSON.stringify(projects));
      localStorage.setItem('braindesk_active_project', activeProjectId);
    } catch (e) {
      console.error(e);
    }
  }, [projects, activeProjectId]);

  // ── Fetch projects ──
  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: getAuthHeaders()
      });
      if (handleAuthError(response)) return;
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0) setActiveProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [API_URL, getAuthHeaders, handleAuthError, navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Data Fetchers ──
  const fetchStats = useCallback(async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/stats?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      if (res.ok) setDbStats(await res.json());
    } catch {
      setDbStats({ total_chunks: 0, documents: [], detailed_documents: [], status: 'offline' });
    }
  }, [getAuthHeaders, handleAuthError]);

  const fetchAnalytics = useCallback(async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/analytics?widget_id=${widgetId}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch { /* non-critical */ }
  }, []);

  const fetchLeads = useCallback(async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/leads?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) return;
      if (res.ok) setLeadsData(await res.json());
    } catch { /* non-critical */ }
  }, [getAuthHeaders, handleAuthError]);

  const fetchBookings = useCallback(async (widgetId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings?widget_id=${widgetId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) setBookingsData(await res.json());
    } catch { /* non-critical */ }
  }, [getAuthHeaders]);

  // ── Auto-fetch data when project or tab changes ──
  useEffect(() => {
    fetchStats(activeProjectId);
    fetchAnalytics(activeProjectId);
    fetchLeads(activeProjectId);
    fetchBookings(activeProjectId);
  }, [activeProjectId, activeTab, fetchStats, fetchAnalytics, fetchLeads, fetchBookings]);

  const value: DashboardContextType = {
    API_URL,
    getAuthHeaders,
    handleAuthError,
    userRole,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    currentProject,
    activeTab,
    setActiveTab,
    dbStats,
    setDbStats,
    analyticsData,
    setAnalyticsData,
    leadsData,
    setLeadsData,
    bookingsData,
    setBookingsData,
    fetchProjects,
    fetchStats,
    fetchAnalytics,
    fetchLeads,
    fetchBookings,
    showToast,
    handleLogout,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </DashboardContext.Provider>
  );
}
