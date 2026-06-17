import React, { useState, useEffect } from 'react';
import { GitCompare, Check, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { getMatches, passMatchToApproval, passAllMatches } from '../utils/api';

export default function MatchesSection() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMatches();
      if (res.success) {
        setMatches(res.matches);
      }
    } catch (err) {
      setError(`Failed to calculate matches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handlePassToApproval = async (match) => {
    setError('');
    setSuccess('');
    try {
      const payload = {
        documentId: match.document._id,
        documentType: match.documentType,
        bankStatementEntryId: match.bankEntry._id,
        confidenceScore: match.confidenceScore
      };
      
      const res = await passMatchToApproval(payload);
      if (res.success) {
        setSuccess(`Successfully passed the suggested match to the approval queue.`);
        // Remove item from matches locally
        setMatches(matches.filter(m => !(m.document._id === match.document._id && m.bankEntry._id === match.bankEntry._id)));
      }
    } catch (err) {
      setError(`Failed to pass match to approval: ${err.message}`);
    }
  };

  const handlePassAll = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await passAllMatches();
      if (res.success) {
        setSuccess(`Bulk reconciliation complete: passed ${res.count} match(es) to the approval queue.`);
        setMatches([]);
      }
    } catch (err) {
      setError(`Failed to bulk pass matches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'confidence-high';
    if (score >= 70) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Smart Reconciliation Matches</h1>
          <p>AI scans and matches invoices/receipts against bank statement entries based on amount, date, and payment terms.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchMatches} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Re-Analyze Statement
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
          Running matching algorithm...
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <GitCompare size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Match Suggestions Found</h3>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            We couldn't find any pending documents matching the current bank statement entries with confidence &gt; 60%.
          </p>
        </div>
            ) : (
        <div>
          <div className="matches-grid" style={{ marginBottom: '32px' }}>
            {matches.map((match, idx) => {
              const docAmt = match.documentType === 'Expense' ? match.document.totalPay : match.document.totalPay;
              const docDate = match.documentType === 'Expense' ? match.document.payDate : match.document.paymentDate;
              
              const bankAmt = match.bankEntry.withdrawals > 0 ? match.bankEntry.withdrawals : match.bankEntry.deposits;
              const isWithdrawal = match.bankEntry.withdrawals > 0;

              return (
                <div key={idx} className="glass-card match-card">
                  <div className="match-body">
                    {/* Left Column: Document */}
                    <div className="match-source">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-info">{match.documentType}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Doc ID: {match.document._id.substring(18)}</span>
                      </div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>{match.document.billFrom}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {match.document.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500' }}>
                        <span>Date: {formatDate(docDate)}</span>
                        <span style={{ color: 'white', fontWeight: '600' }}>${docAmt.toFixed(2)}</span>
                      </div>
                      {match.documentType === 'Expense' && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Terms: {match.document.payTerms}
                        </div>
                      )}
                    </div>

                    {/* Middle Column: Confidence */}
                    <div className="match-relation">
                      <span className={`confidence-indicator ${getScoreColorClass(match.confidenceScore)}`}>
                        {match.confidenceScore}%
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Confidence</span>
                      <ChevronRight size={24} style={{ color: 'var(--text-muted)', marginTop: '8px' }} />
                    </div>

                    {/* Right Column: Bank Statement Entry */}
                    <div className="match-target">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className={`badge ${isWithdrawal ? 'badge-rejected' : 'badge-approved'}`}>
                          {isWithdrawal ? 'Withdrawal' : 'Deposit'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bank Statement</span>
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {match.bankEntry.particulars}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Running Bal: ${match.bankEntry.balance.toFixed(2)}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500' }}>
                        <span>Date: {formatDate(match.bankEntry.date)}</span>
                        <span style={{ color: isWithdrawal ? '#fca5a5' : '#a7f3d0', fontWeight: '600' }}>
                          ${bankAmt.toFixed(2)}
                        </span>
                      </div>
                      {match.bankEntry.paymentTerm && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Term: {match.bankEntry.paymentTerm}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="match-breakdown">
                    <span>Amount Match: {match.breakdown.amount} / 45</span>
                    <span>Date Proximity: {match.breakdown.date} / 35</span>
                    <span>Payment Term Match: {match.breakdown.terms} / 20</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => handlePassToApproval(match)}>
                      <Check size={16} />
                      Pass to Approval Page
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '14px 28px', fontSize: '15px', boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}
              onClick={handlePassAll}
            >
              <GitCompare size={18} />
              Pass All to Approval Page
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
