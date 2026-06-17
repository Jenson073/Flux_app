import React, { useState, useEffect } from 'react';
import { FileText, Trash2, ShieldAlert, Check, RefreshCw, Download, Edit, X, Save } from 'lucide-react';
import { getTransactions, deleteTransaction, getBankStatement, getMatchedTransactions, editTransaction } from '../utils/api';

export default function TransactionsSection() {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'expenses' | 'receipts' | 'bank' | 'matched'
  const [transactions, setTransactions] = useState({ invoices: [], expenses: [], receipts: [] });
  const [bankStatement, setBankStatement] = useState([]);
  const [matched, setMatched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editType, setEditType] = useState(''); // 'invoice', 'expense', 'receipt'
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState({});

  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch documents
      const docsRes = await getTransactions();
      if (docsRes.success) {
        setTransactions({
          invoices: docsRes.invoices,
          expenses: docsRes.expenses,
          receipts: docsRes.receipts
        });
      }

      // Fetch bank statement
      const bankRes = await getBankStatement();
      if (bankRes.success) {
        setBankStatement(bankRes.bankStatement);
      }

      // Fetch matched transactions
      const matchedRes = await getMatchedTransactions();
      if (matchedRes.success) {
        setMatched(matchedRes.matched);
      }
    } catch (err) {
      setError(`Failed to load transactions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    setError('');
    setSuccess('');
    try {
      const res = await deleteTransaction(type, id);
      if (res.success) {
        setSuccess(`Successfully deleted the ${type}.`);
        fetchDocs();
      }
    } catch (err) {
      setError(`Failed to delete transaction: ${err.message}`);
    }
  };

  const handleDownload = (fileName) => {
    if (!fileName) return;
    const downloadUrl = `http://localhost:5000/api/transactions/download/${encodeURIComponent(fileName)}`;
    window.open(downloadUrl, '_blank');
  };

  const openEditModal = (type, item) => {
    setEditType(type);
    setEditId(item._id);
    
    const initialForm = { ...item };
    // Format dates for input field (YYYY-MM-DD)
    if (initialForm.dueDate) initialForm.dueDate = String(initialForm.dueDate).split('T')[0];
    if (initialForm.payDate) initialForm.payDate = String(initialForm.payDate).split('T')[0];
    if (initialForm.paymentDate) initialForm.paymentDate = String(initialForm.paymentDate).split('T')[0];
    
    setEditForm(initialForm);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (field, val) => {
    setEditForm({
      ...editForm,
      [field]: val
    });
  };

  const handleSaveEdit = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await editTransaction(editType, editId, editForm);
      if (res.success) {
        setSuccess(`Successfully updated the ${editType}.`);
        setIsEditModalOpen(false);
        fetchDocs();
      }
    } catch (err) {
      setError(`Failed to update document: ${err.message}`);
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

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Stored Transactions & Statement</h1>
          <p>View Invoices, Expenses, Receipts, the current Bank Statement, and Matched Reconciliations.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDocs} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Reload Data
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

      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Invoices ({transactions.invoices.length})
        </button>
        <button 
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses ({transactions.expenses.length})
        </button>
        <button 
          className={`tab ${activeTab === 'receipts' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipts')}
        >
          Receipts ({transactions.receipts.length})
        </button>
        <button 
          className={`tab ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank')}
        >
          Bank Statement ({bankStatement.length})
        </button>
        <button 
          className={`tab ${activeTab === 'matched' ? 'active' : ''}`}
          onClick={() => setActiveTab('matched')}
        >
          Matched Pairings ({matched.length})
        </button>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Loading ledger records...
          </div>
        ) : (
          <div className="table-container">
            {activeTab === 'invoices' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bill From</th>
                    <th>Invoice No</th>
                    <th>Due Date</th>
                    <th>Description</th>
                    <th>Total Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.invoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices stored yet.</td>
                    </tr>
                  ) : (
                    transactions.invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: '500' }}>{inv.billFrom}</td>
                        <td style={{ fontFamily: 'monospace' }}>{inv.invoiceNo}</td>
                        <td>{formatDate(inv.dueDate)}</td>
                        <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.description}
                        </td>
                        <td style={{ fontWeight: '600' }}>${inv.totalDue.toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => openEditModal('invoice', inv)}
                              title="Edit invoice details"
                            >
                              <Edit size={13} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => handleDownload(inv.fileName)}
                              title="Download document file"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete('invoice', inv._id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'expenses' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bill From</th>
                    <th>Pay Date</th>
                    <th>Pay Terms</th>
                    <th>Description</th>
                    <th>Total Pay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.expenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses stored yet.</td>
                    </tr>
                  ) : (
                    transactions.expenses.map((exp) => (
                      <tr key={exp._id}>
                        <td style={{ fontWeight: '500' }}>{exp.billFrom}</td>
                        <td>{formatDate(exp.payDate)}</td>
                        <td><span className="badge badge-info">{exp.payTerms}</span></td>
                        <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exp.description}
                        </td>
                        <td style={{ fontWeight: '600' }}>${exp.totalPay.toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => openEditModal('expense', exp)}
                              title="Edit expense details"
                            >
                              <Edit size={13} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => handleDownload(exp.fileName)}
                              title="Download document file"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete('expense', exp._id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'receipts' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Bill From</th>
                    <th>Payment Date</th>
                    <th>Total Pay</th>
                    <th>Remaining Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.receipts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No receipts stored yet.</td>
                    </tr>
                  ) : (
                    transactions.receipts.map((rec) => (
                      <tr key={rec._id}>
                        <td style={{ fontFamily: 'monospace' }}>{rec.invoiceNo}</td>
                        <td style={{ fontWeight: '500' }}>{rec.billFrom}</td>
                        <td>{formatDate(rec.paymentDate)}</td>
                        <td style={{ fontWeight: '600' }}>${rec.totalPay.toFixed(2)}</td>
                        <td style={{ fontWeight: '600', color: rec.remaining <= 0.01 ? 'var(--success)' : 'var(--warning)' }}>
                          ${rec.remaining.toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => openEditModal('receipt', rec)}
                              title="Edit receipt details"
                            >
                              <Edit size={13} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => handleDownload(rec.fileName)}
                              title="Download document file"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete('receipt', rec._id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'bank' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th>Payment Term</th>
                    <th>Withdrawals</th>
                    <th>Deposits</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {bankStatement.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bank statement loaded.</td>
                    </tr>
                  ) : (
                    bankStatement.map((entry) => {
                      const isOutflow = entry.withdrawals > 0;
                      return (
                        <tr key={entry._id}>
                          <td>{formatDate(entry.date)}</td>
                          <td style={{ fontWeight: '500' }}>{entry.particulars}</td>
                          <td><span className="badge badge-info">{entry.paymentTerm || 'Bank Transfer'}</span></td>
                          <td style={{ color: '#fca5a5', fontWeight: '500' }}>
                            {entry.withdrawals > 0 ? `$${entry.withdrawals.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ color: 'var(--success)', fontWeight: '500' }}>
                            {entry.deposits > 0 ? `$${entry.deposits.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ fontWeight: '600' }}>${entry.balance.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'matched' && (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date Approved</th>
                    <th>Reconciled Document</th>
                    <th>Document Amt</th>
                    <th>Bank Statement Entry</th>
                    <th>Bank Amt</th>
                    <th>Confidence</th>
                    <th>Download Doc</th>
                  </tr>
                </thead>
                <tbody>
                  {matched.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No matched pairings approved yet.</td>
                    </tr>
                  ) : (
                    matched.map((item) => {
                      const docAmt = item.document?.totalPay || 0;
                      const bankAmt = item.bankEntry ? (item.bankEntry.withdrawals > 0 ? item.bankEntry.withdrawals : item.bankEntry.deposits) : 0;
                      const docName = item.document?.billFrom || 'Unknown';
                      
                      return (
                        <tr key={item.approvalId} style={{ borderLeft: '4px solid var(--success)' }}>
                          <td>{formatDate(item.approvedAt)}</td>
                          <td>
                            <strong>{item.documentType}:</strong> {docName}
                          </td>
                          <td style={{ fontWeight: '500' }}>${docAmt.toFixed(2)}</td>
                          <td>{item.bankEntry?.particulars || 'Deleted'}</td>
                          <td style={{ fontWeight: '500' }}>${bankAmt.toFixed(2)}</td>
                          <td style={{ color: 'var(--success)', fontWeight: '600' }}>{item.confidenceScore}%</td>
                          <td>
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => handleDownload(item.document?.fileName)}
                              disabled={!item.document?.fileName}
                              title="Download document file"
                            >
                              <Download size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Inline Editing Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Edit {editType.toUpperCase()}</h3>
              <button className="btn btn-secondary btn-small" style={{ padding: '4px' }} onClick={() => setIsEditModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {editType === 'invoice' && (
              <>
                <div className="form-group">
                  <label className="form-label">Bill From</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.billFrom || ''}
                    onChange={(e) => handleEditChange('billFrom', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice No</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.invoiceNo || ''}
                    onChange={(e) => handleEditChange('invoiceNo', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editForm.dueDate || ''}
                    onChange={(e) => handleEditChange('dueDate', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.description || ''}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Due ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editForm.totalDue || 0}
                    onChange={(e) => handleEditChange('totalDue', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </>
            )}

            {editType === 'expense' && (
              <>
                <div className="form-group">
                  <label className="form-label">Bill From</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.billFrom || ''}
                    onChange={(e) => handleEditChange('billFrom', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pay Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editForm.payDate || ''}
                    onChange={(e) => handleEditChange('payDate', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pay Terms</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.payTerms || ''}
                    onChange={(e) => handleEditChange('payTerms', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.description || ''}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Pay ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editForm.totalPay || 0}
                    onChange={(e) => handleEditChange('totalPay', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </>
            )}

            {editType === 'receipt' && (
              <>
                <div className="form-group">
                  <label className="form-label">Invoice No</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.invoiceNo || ''}
                    onChange={(e) => handleEditChange('invoiceNo', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bill From</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.billFrom || ''}
                    onChange={(e) => handleEditChange('billFrom', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editForm.paymentDate || ''}
                    onChange={(e) => handleEditChange('paymentDate', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Paid ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editForm.totalPay || 0}
                    onChange={(e) => handleEditChange('totalPay', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
