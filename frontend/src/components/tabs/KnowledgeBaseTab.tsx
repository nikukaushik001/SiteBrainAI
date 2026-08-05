import { useState, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export default function KnowledgeBaseTab() {
  const {
    currentProject, activeProjectId, API_URL, dbStats,
    getAuthHeaders, handleAuthError, fetchStats, showToast
  } = useDashboard();

  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [inputUrl, setInputUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState<{ status: 'idle' | 'scraping' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [sitemapStatus, setSitemapStatus] = useState<{ status: 'idle' | 'crawling' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [isResetting, setIsResetting] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadStatus({ status: 'error', message: 'Only PDF, DOCX, TXT, and CSV files are supported.' });
      return;
    }
    setUploadStatus({ status: 'uploading', message: `Uploading ${file.name} for ${currentProject.name}...` });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_URL}/upload?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setUploadStatus({ status: 'success', message: data.message });
        showToast(data.message, 'success');
        fetchStats(activeProjectId);
      } else {
        setUploadStatus({ status: 'error', message: data.detail || 'Upload failed.' });
        showToast(data.detail || 'Upload failed.', 'error');
      }
    } catch {
      setUploadStatus({ status: 'error', message: 'Failed to connect to the backend API server.' });
      showToast('Failed to connect to the backend API server.', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlScrape = async () => {
    if (!inputUrl.trim()) return;
    setScrapeStatus({ status: 'scraping', message: `Crawling website ${inputUrl}...` });
    try {
      const response = await fetch(`${API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: inputUrl.trim(), widget_id: activeProjectId })
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setScrapeStatus({ status: 'success', message: data.message });
        showToast(data.message, 'success');
        setInputUrl('');
        fetchStats(activeProjectId);
      } else {
        setScrapeStatus({ status: 'error', message: data.detail || 'Scraping failed.' });
        showToast(data.detail || 'Scraping failed.', 'error');
      }
    } catch {
      setScrapeStatus({ status: 'error', message: 'Failed to connect to the backend server.' });
    }
  };

  const handleSitemapCrawl = async () => {
    if (!sitemapUrl.trim()) return;
    setSitemapStatus({ status: 'crawling', message: `Discovering and crawling all pages from sitemap...` });
    try {
      const response = await fetch(`${API_URL}/scrape/sitemap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: sitemapUrl.trim(), widget_id: activeProjectId })
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (response.ok) {
        setSitemapStatus({ status: 'success', message: data.message });
        showToast(data.message, 'success');
        setSitemapUrl('');
        fetchStats(activeProjectId);
      } else {
        setSitemapStatus({ status: 'error', message: data.detail || 'Sitemap crawl failed.' });
        showToast(data.detail || 'Sitemap crawl failed.', 'error');
      }
    } catch {
      setSitemapStatus({ status: 'error', message: 'Failed to connect to the backend server.' });
    }
  };

  const handleDeleteDocument = async (sourceName: string) => {
    if (!window.confirm(`Are you sure you want to delete source '${sourceName}' from '${currentProject.name}'?`)) return;
    setDeletingSource(sourceName);
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ source: sourceName, widget_id: activeProjectId })
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Document deleted successfully!', 'success');
        fetchStats(activeProjectId);
      } else {
        showToast('Failed to delete document: ' + (data.detail || 'Unknown error'), 'error');
      }
    } catch {
      showToast('Error connecting to backend server.', 'error');
    } finally {
      setDeletingSource(null);
    }
  };

  const handleResetBrain = async () => {
    if (!window.confirm(`Reset the Knowledge Base for '${currentProject.name}'? Only vectors for this business will be cleared.`)) return;
    setIsResetting(true);
    try {
      const res = await fetch(`${API_URL}/reset?widget_id=${activeProjectId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (handleAuthError(res)) { setIsResetting(false); return; }
      const data = await res.json();
      if (res.ok) {
        showToast(`Knowledge Base for '${currentProject.name}' reset successfully!`, 'success');
        fetchStats(activeProjectId);
      } else {
        showToast('Error resetting database: ' + data.detail, 'error');
      }
    } catch {
      showToast('Failed to connect to backend server.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1>Knowledge Base</h1>
          <p>Upload Documents (PDF, DOCX, TXT, CSV) or crawl website URLs for <strong>{currentProject.name}</strong>.</p>
        </div>
        <button className="btn-danger" onClick={handleResetBrain} disabled={isResetting}>
          {isResetting ? 'Resetting...' : `🗑️ Reset Brain`}
        </button>
      </div>

      {/* Ingestion Grid */}
      <div className="ingestion-grid">
        {/* Document Uploader */}
        <div className="glass-panel section-panel">
          <div className="section-title">
            <span>📄</span> Document Upload
          </div>
          <p className="section-subtitle">Upload employee handbooks, pricing PDFs, text files, or CSVs.</p>

          <div
            className="upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
          >
            <div className="upload-icon">📄</div>
            <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Drop document here</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click or drag file (PDF, DOCX, TXT, CSV) · up to 50MB</p>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
          </div>

          {uploadStatus.status !== 'idle' && (
            <div className={`upload-status ${uploadStatus.status}`}>
              <p>{uploadStatus.message}</p>
            </div>
          )}
        </div>

        {/* Web URL Crawler */}
        <div className="glass-panel section-panel">
          <div className="section-title">
            <span>🌐</span> Web URL Crawler
          </div>
          <p className="section-subtitle">Paste any website link to scrape live web text automatically into the knowledge base.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              className="url-input"
              type="text"
              placeholder="e.g. https://mybusiness.com/faq"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
            />
            <button className="btn-primary" onClick={handleUrlScrape} disabled={scrapeStatus.status === 'scraping'}>
              {scrapeStatus.status === 'scraping' ? 'Crawling Web Page...' : '🌐 Crawl & Index Website'}
            </button>
          </div>

          {scrapeStatus.status !== 'idle' && (
            <div className={`upload-status ${scrapeStatus.status}`} style={{ marginTop: '16px' }}>
              <p>{scrapeStatus.message}</p>
            </div>
          )}
        </div>

        {/* Sitemap Auto-Crawler */}
        <div className="glass-panel section-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="section-title">
            <span>🗺️</span> Full Website Sitemap Crawler
            <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', fontWeight: 700 }}>NEW</span>
          </div>
          <p className="section-subtitle">
            Paste your <code>sitemap.xml</code> URL to automatically discover and index <strong>all pages</strong> of a website at once — instead of adding URLs one by one. Up to 50 pages per crawl.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              className="url-input"
              type="text"
              placeholder="e.g. https://mybusiness.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSitemapCrawl()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleSitemapCrawl} disabled={sitemapStatus.status === 'crawling'}>
              {sitemapStatus.status === 'crawling' ? '⏳ Crawling All Pages...' : '🗺️ Crawl Full Sitemap'}
            </button>
          </div>

          {sitemapStatus.status !== 'idle' && (
            <div className={`upload-status ${sitemapStatus.status === 'crawling' ? 'uploading' : sitemapStatus.status}`} style={{ marginTop: '14px' }}>
              <p>{sitemapStatus.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Knowledge Sources */}
      <div className="glass-panel section-panel">
        <div className="section-title">📊 Active Knowledge Sources ({currentProject.name})</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent-indigo)', padding: '14px 22px', borderRadius: '12px', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Indexed Chunks
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-indigo)', lineHeight: 1 }}>
              {dbStats.total_chunks}
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
            BrainDesk RAG searches PDF documents and crawled URLs tagged with <code>widget_id: "{activeProjectId}"</code>.
          </p>
        </div>

        {dbStats.detailed_documents && dbStats.detailed_documents.length > 0 ? (
          <div>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.6px' }}>
              📁 Managed Documents &amp; Sources ({dbStats.detailed_documents.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {dbStats.detailed_documents.map((docItem, idx) => {
                const isWeb = docItem.type === 'web' || docItem.source.startsWith('http');
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{isWeb ? '🌐' : '📄'}</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={docItem.source}>
                          {docItem.title || getBasename(docItem.source)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                          {docItem.source}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: isWeb ? 'rgba(6,182,212,0.18)' : 'rgba(16,185,129,0.18)', color: isWeb ? 'var(--accent-cyan)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                          {isWeb ? 'Web URL' : 'PDF Document'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {docItem.chunks} {docItem.chunks === 1 ? 'chunk' : 'chunks'}
                        </span>
                      </div>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        disabled={deletingSource === docItem.source}
                        onClick={() => handleDeleteDocument(docItem.source)}
                      >
                        {deletingSource === docItem.source ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            No documents indexed for <strong>{currentProject.name}</strong> yet. Upload a PDF or crawl a website URL above!
          </div>
        )}
      </div>
    </div>
  );
}
