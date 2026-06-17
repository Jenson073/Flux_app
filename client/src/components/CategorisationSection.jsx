import React, { useState, useEffect } from 'react';
import { Layers, Check, AlertCircle, RefreshCw, BadgeCheck, Search, SlidersHorizontal } from 'lucide-react';
import { getCategoriseTransactions, confirmCategorisation } from '../utils/api';

export default function CategorisationSection() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchCategorizationList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCategoriseTransactions();
      if (res.success) {
        // Enforce exclusion of Bank Statement in frontend just in case
        const filtered = res.transactions.filter(tx => tx.type !== 'BankStatement' && tx.type !== 'Bank Statement');
        const mapped = filtered.map(tx => ({
          ...tx,
          originalCategory: tx.category
        }));
        setTransactions(mapped);
      }
    } catch (err) {
      setError(`Failed to load categorizations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorizationList();
  }, []);

  const handleCategoryChange = (id, type, value) => {
    const updated = transactions.map(tx => {
      if (tx.id === id && tx.type === type) {
        return {
          ...tx,
          category: value
        };
      }
      return tx;
    });
    setTransactions(updated);
  };

  const handleConfirm = async (id, type, category) => {
    setError('');
    setSuccess('');
    try {
      const res = await confirmCategorisation({ id, type, category });
      if (res.success) {
        setSuccess(`Successfully confirmed category "${category}" for the transaction.`);
        // Mark as confirmed and update original category in state
        const updated = transactions.map(tx => {
          if (tx.id === id && tx.type === type) {
            return {
              ...tx,
              categoryStatus: 'Confirmed',
              originalCategory: category,
              category
            };
          }
          return tx;
        });
        setTransactions(updated);
      }
    } catch (err) {
      setError(`Failed to confirm categorization: ${err.message}`);
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

  const categories = [
    'Payroll Expense',
    'Bill Utilities',
    'Office Expenses',
    'Sales Revenue',
    'Miscellaneous'
  ];

  // Filtering Logic
  const filteredTransactions = transactions.filter(tx => {
    // 1. Text Search Filter (on Description)
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Status Filter
    const matchesStatus = statusFilter === 'All' || tx.categoryStatus === statusFilter;
    
    // 3. Category Filter
    const matchesCategory = categoryFilter === 'All' || tx.category === categoryFilter;
    
    // 4. Type Filter
    const matchesType = typeFilter === 'All' || tx.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  });

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Ledger Categorisation</h1>
          <p>Review and assign accounts for all invoices, receipts, and expenses in a unified ledger grid.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchCategorizationList} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Reload Ledger
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

      {/* Filters Card */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
          <SlidersHorizontal size={18} />
          <span>Filters & Search</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Search Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Search Description</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search description..."
                className="form-control"
                style={{ paddingLeft: '36px', width: '100%' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Status</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Suggested">Suggested</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Category</label>
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Doc Type</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Invoice">Invoice</option>
              <option value="Receipt">Receipt</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Processing ledger categorization rules...
        </div>
      ) : (
        <div className="glass-card">
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No transactions match your filters.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category Selection</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.amount > 0;
                    const isSuggested = tx.categoryStatus === 'Suggested';
                    const hasChanged = tx.category !== tx.originalCategory;

                    // Choose badge class for document type
                    let typeBadgeClass = 'badge-info';
                    if (tx.type === 'Invoice') typeBadgeClass = 'badge-info';
                    else if (tx.type === 'Receipt') typeBadgeClass = 'badge-success';
                    else if (tx.type === 'Expense') typeBadgeClass = 'badge-danger';

                    return (
                      <tr key={tx.id + '_' + tx.type}>
                        <td>{formatDate(tx.date)}</td>
                        <td style={{ fontWeight: '500', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.description}
                        </td>
                        <td>
                          <span className={`badge ${typeBadgeClass}`}>{tx.type}</span>
                        </td>
                        <td style={{ fontWeight: '600', color: isIncome ? 'var(--success)' : '#fca5a5' }}>
                          {isIncome ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '6px 12px', minWidth: '180px', background: hasChanged ? 'rgba(99, 102, 241, 0.15)' : undefined }}
                            value={tx.category}
                            onChange={(e) => handleCategoryChange(tx.id, tx.type, e.target.value)}
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {isSuggested ? (
                            <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              Suggested
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <BadgeCheck size={12} />
                              Confirmed
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isSuggested ? (
                            <button
                              className="btn btn-primary btn-small"
                              onClick={() => handleConfirm(tx.id, tx.type, tx.category)}
                            >
                              Confirm
                            </button>
                          ) : hasChanged ? (
                            <button
                              className="btn btn-secondary btn-small"
                              style={{ borderColor: 'var(--accent-indigo)' }}
                              onClick={() => handleConfirm(tx.id, tx.type, tx.category)}
                            >
                              Update
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px', paddingRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} style={{ color: 'var(--success)' }} />
                              Saved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
