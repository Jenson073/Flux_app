import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, Calendar, FileText, BadgeAlert } from 'lucide-react';
import { getAlerts } from '../utils/api';

export default function AlertsSection() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAlerts();
      if (res.success) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      setError(`Failed to fetch system alerts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'badge badge-rejected';
      case 'HIGH': return 'badge badge-pending';
      default: return 'badge badge-info';
    }
  };

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Security & Ledger Alerts</h1>
          <p>System-wide active alerts regarding cashflow delays, unpaid invoice deadlines, and auditor-escalated anomalies.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAlerts} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Re-Check Alerts
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          Running ledger security check...
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <BadgeAlert size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
          <h3>System Clear</h3>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            No unpaid invoices within 15 days of due date, and no active flagged anomalies detected.
          </p>
        </div>
      ) : (
        <div className="glass-card">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Alert Type</th>
                  <th>Description</th>
                  <th>Due / Escalate Date</th>
                  <th>Source File</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, idx) => {
                  const isProximity = alert.type === 'InvoiceProximity';
                  const doc = alert.documentDetails;
                  
                  return (
                    <tr key={alert.id + '_' + idx} style={{ borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'}` }}>
                      <td>
                        <span className={getSeverityBadgeClass(alert.severity)}>
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isProximity ? <Calendar size={16} style={{ color: 'var(--accent-cyan)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />}
                          {alert.title}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
                        {alert.description}
                      </td>
                      <td>
                        {isProximity 
                          ? formatDate(doc.dueDate) 
                          : formatDate(alert.createdAt)
                        }
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {doc?.fileName || 'System Log'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
