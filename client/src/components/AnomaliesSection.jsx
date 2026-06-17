import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, ShieldAlert, RefreshCw, Eye } from 'lucide-react';
import { getAnomalies, passAnomalyToApproval } from '../utils/api';

export default function AnomaliesSection() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAnomalies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAnomalies();
      if (res.success) {
        setAnomalies(res.anomalies);
      }
    } catch (err) {
      setError(`Failed to run anomaly scan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handlePassToApproval = async (anomaly, index) => {
    setError('');
    setSuccess('');
    try {
      const payload = {
        documentId: anomaly.document._id,
        documentType: anomaly.documentType,
        anomalyType: anomaly.type,
        description: anomaly.description
      };
      
      const res = await passAnomalyToApproval(payload);
      if (res.success) {
        setSuccess(`Passed anomaly to approval page for verification.`);
        // Update anomaly state locally
        const updated = [...anomalies];
        updated[index].status = 'Pending';
        setAnomalies(updated);
      }
    } catch (err) {
      setError(`Failed to pass anomaly: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="badge badge-approved">Approved</span>;
      case 'Rejected': return <span className="badge badge-rejected">Rejected</span>;
      case 'Pending': return <span className="badge badge-info">In Approval Queue</span>;
      default: return <span className="badge badge-pending">Unverified</span>;
    }
  };

  const duplicates = anomalies.filter(a => a.type === 'DuplicateInvoice');
  const highExpenses = anomalies.filter(a => a.type === 'HighExpense');

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Security & Anomaly Audit</h1>
          <p>Scans invoice collections and expense items to flag duplicates, ledger errors, and out-of-boundary expenses.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAnomalies} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Re-Scan Collections
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-banner alert-banner-success">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          Analyzing transactions for anomalies...
        </div>
      ) : anomalies.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <Check size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
          <h3>No Anomalies Detected</h3>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            All invoices and expenses are verified. No duplicate invoice records or out-of-bounds category expenses found.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Section 1: Duplicate Invoices */}
          {duplicates.length > 0 && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                Duplicate Invoices ({duplicates.length})
              </h2>
              <div className="glass-card">
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Invoice No</th>
                        <th>Amount</th>
                        <th>Audit Flag</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((anom, idx) => {
                        const globalIndex = anomalies.findIndex(a => a.document._id === anom.document._id && a.type === anom.type);
                        return (
                          <tr key={anom.document._id + '_' + idx}>
                            <td style={{ fontWeight: '500' }}>{anom.document.billFrom}</td>
                            <td style={{ fontFamily: 'monospace' }}>{anom.document.invoiceNo}</td>
                            <td style={{ fontWeight: '600' }}>${anom.document.totalDue.toFixed(2)}</td>
                            <td style={{ color: '#fca5a5', maxWidth: '280px' }}>{anom.description}</td>
                            <td>{getStatusBadge(anom.status)}</td>
                            <td>
                              {anom.status === 'New' ? (
                                <button 
                                  className="btn btn-primary btn-small"
                                  onClick={() => handlePassToApproval(anom, globalIndex)}
                                >
                                  Pass to Approval
                                </button>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Large/High Category Expenses */}
          {highExpenses.length > 0 && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                High / Out-of-Bounds Expenses ({highExpenses.length})
              </h2>
              <div className="glass-card">
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Merchant</th>
                        <th>Pay Date</th>
                        <th>Amount</th>
                        <th>Audit Flag</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highExpenses.map((anom, idx) => {
                        const globalIndex = anomalies.findIndex(a => a.document._id === anom.document._id && a.type === anom.type);
                        return (
                          <tr key={anom.document._id + '_' + idx}>
                            <td style={{ fontWeight: '500' }}>{anom.document.billFrom}</td>
                            <td>{new Date(anom.document.payDate).toLocaleDateString()}</td>
                            <td style={{ fontWeight: '600', color: '#fca5a5' }}>${anom.document.totalPay.toFixed(2)}</td>
                            <td style={{ color: '#fca5a5', maxWidth: '300px' }}>{anom.description}</td>
                            <td>{getStatusBadge(anom.status)}</td>
                            <td>
                              {anom.status === 'New' ? (
                                <button 
                                  className="btn btn-primary btn-small"
                                  onClick={() => handlePassToApproval(anom, globalIndex)}
                                >
                                  Pass to Approval
                                </button>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
