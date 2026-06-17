import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, FileText, Check, Database, GitCompare, UserCheck } from 'lucide-react';
import { getAuditLogs } from '../utils/api';

export default function AuditLogSection() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs();
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      setError(`Failed to fetch audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogIcon = (action) => {
    if (action.includes('UPLOAD') || action.includes('PARSE')) {
      return <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />;
    }
    if (action.includes('SAVE') || action.includes('REPLACE')) {
      return <Database size={16} style={{ color: 'var(--accent-blue)' }} />;
    }
    if (action.includes('PASS_') || action.includes('MATCH')) {
      return <GitCompare size={16} style={{ color: 'var(--accent-indigo)' }} />;
    }
    if (action.includes('APPROVE') || action.includes('REJECT') || action.includes('CATEGORIZE')) {
      return <UserCheck size={16} style={{ color: 'var(--success)' }} />;
    }
    return <Activity size={16} style={{ color: 'var(--text-secondary)' }} />;
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('REJECT') || action.includes('DELETE')) return 'badge badge-rejected';
    if (action.includes('APPROVE') || action.includes('CONFIRM')) return 'badge badge-approved';
    if (action.includes('PARSE') || action.includes('UPLOAD')) return 'badge badge-info';
    return 'badge badge-pending';
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      (log.meta && JSON.stringify(log.meta).toLowerCase().includes(query))
    );
  });

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>System Audit Trail</h1>
          <p>Chronological immutable record of all parsing activities, reconciliation approvals, manual categorizations, and system replacements.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Audit Log
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(10, 14, 41, 0.5)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '0 12px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
          <input
            type="text"
            className="form-control"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
            placeholder="Search audit trail by action, filename, status or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Retrieving ledger audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No audit logs found.
          </div>
        ) : (
          <div className="timeline">
            {filteredLogs.map((log) => (
              <div key={log._id} className="timeline-item">
                <div className="timeline-badge">
                  {getLogIcon(log.action)}
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600' }}>
                      {log.details}
                    </h4>
                    <span className={getActionBadgeClass(log.action)}>
                      {log.action}
                    </span>
                  </div>
                  
                  <div className="timeline-time">
                    {new Date(log.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <pre style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: '6px', 
                      fontSize: '11px', 
                      fontFamily: 'monospace',
                      color: 'var(--text-secondary)',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
