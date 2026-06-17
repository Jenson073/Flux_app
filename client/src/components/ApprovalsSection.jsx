import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { getApprovals, processApprovalAction } from '../utils/api';

export default function ApprovalsSection() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Rejection modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionId, setRejectionId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getApprovals();
      if (res.success) {
        setApprovals(res.approvals);
      }
    } catch (err) {
      setError(`Failed to load approvals: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (id, action, reason = '') => {
    setError('');
    setSuccess('');
    try {
      const res = await processApprovalAction(id, action, reason);
      if (res.success) {
        let actionMsg = 'approved';
        if (action === 'alert') actionMsg = 'alerted';
        else if (action === 'reject') actionMsg = 'rejected';
        setSuccess(`Successfully ${actionMsg} the item.`);
        setApprovals(approvals.filter(a => a._id !== id));
        setIsModalOpen(false);
        setRejectionReason('');
      }
    } catch (err) {
      setError(`Action failed: ${err.message}`);
    }
  };

  const openRejectionModal = (id) => {
    setRejectionId(id);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason.');
      return;
    }
    const item = approvals.find(a => a._id === rejectionId);
    const isAnomaly = item && item.type === 'Anomaly';
    handleAction(rejectionId, isAnomaly ? 'alert' : 'reject', rejectionReason);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Approval Queue</h1>
          <p>Verify matches and review detected anomalies before confirming them in accounting ledgers.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchApprovals} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Queue
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error">
          <AlertCircle size={20} />
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
          Loading pending approvals...
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <Check size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
          <h3>All Cleared!</h3>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            There are no pending matches or anomalies requiring verification.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {approvals.map((app) => {
            const isMatch = app.type === 'Match';
            
            return (
              <div key={app._id} className="glass-card" style={{ borderLeft: `4px solid ${isMatch ? 'var(--accent-indigo)' : 'var(--danger)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`badge ${isMatch ? 'badge-info' : 'badge-rejected'}`}>
                      {isMatch ? 'Match Verification' : 'Anomaly Audit'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created {formatDate(app.createdAt)}</span>
                  </div>
                  {isMatch && (
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>
                      Confidence Score: {app.details.confidenceScore}%
                    </span>
                  )}
                </div>

                {/* Match Details */}
                {isMatch && app.documentDetails && app.bankStatementDetails && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(10, 14, 41, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Document ({app.details.documentType})
                      </h4>
                      <div style={{ fontSize: '15px', fontWeight: '600' }}>{app.documentDetails.billFrom}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {app.documentDetails.description}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
                        <span>Date: {formatDate(app.details.documentType === 'Expense' ? app.documentDetails.payDate : app.documentDetails.paymentDate)}</span>
                        <span style={{ fontWeight: '600' }}>${app.documentDetails.totalPay.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(10, 14, 41, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Bank Statement Entry
                      </h4>
                      <div style={{ fontSize: '15px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.bankStatementDetails.particulars}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Running Balance: ${app.bankStatementDetails.balance.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
                        <span>Date: {formatDate(app.bankStatementDetails.date)}</span>
                        <span style={{ fontWeight: '600', color: app.bankStatementDetails.withdrawals > 0 ? '#fca5a5' : '#a7f3d0' }}>
                          ${(app.bankStatementDetails.withdrawals > 0 ? app.bankStatementDetails.withdrawals : app.bankStatementDetails.deposits).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Anomaly Details */}
                {!isMatch && (
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <ShieldAlert size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fca5a5', textTransform: 'uppercase' }}>
                        {app.details.anomalyType === 'DuplicateInvoice' ? 'Duplicate Invoice Detected' : 'Large Category Expense Alert'}
                      </h4>
                      <p style={{ fontSize: '14px', marginTop: '4px' }}>{app.details.description}</p>
                      
                      {app.documentDetails && (
                        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <span>Bill From: <strong>{app.documentDetails.billFrom}</strong></span>
                          {app.documentDetails.invoiceNo && <span>Invoice No: <strong>{app.documentDetails.invoiceNo}</strong></span>}
                          <span>Total: <strong>${(app.documentDetails.totalDue || app.documentDetails.totalPay || 0).toFixed(2)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  {isMatch ? (
                    <>
                      <button className="btn btn-danger" onClick={() => openRejectionModal(app._id)}>
                        <X size={16} />
                        Reject Match
                      </button>
                      <button className="btn btn-success" onClick={() => handleAction(app._id, 'approve')}>
                        <Check size={16} />
                        Approve Reconciliation
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-danger" onClick={() => openRejectionModal(app._id)}>
                        <ShieldAlert size={16} />
                        Alert!
                      </button>
                      <button className="btn btn-success" onClick={() => handleAction(app._id, 'approve')}>
                        <Check size={16} />
                        No Risk
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {isModalOpen && (() => {
        const item = approvals.find(a => a._id === rejectionId);
        const isAnomaly = item && item.type === 'Anomaly';
        
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <MessageSquare size={24} style={{ color: 'var(--danger)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                  {isAnomaly ? 'Flag Anomaly Alert' : 'Rejection Description'}
                </h3>
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {isAnomaly 
                  ? 'Please specify the security explanation or audit reason for flagging this anomaly as a ledger alert.' 
                  : 'Please specify the audit reason or correction explanation for rejecting this suggested transaction match.'}
              </p>
              
              <div className="form-group">
                <label className="form-label">Description / Reason</label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder={isAnomaly ? "e.g. Unusual invoice duplication from vendor..." : "e.g. Total amount mismatch on bank ledger..."}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={submitRejection}>
                  {isAnomaly ? 'Escalate Alert' : 'Submit Rejection'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
