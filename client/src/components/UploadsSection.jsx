import React, { useState } from 'react';
import { Upload, Check, AlertCircle, FileSpreadsheet, FileText, Save, RefreshCw } from 'lucide-react';
import { parseFile, saveParsedData } from '../utils/api';

export default function UploadsSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewType, setPreviewType] = useState(''); // 'Invoice', 'Expense', 'Receipt', 'BankStatement'
  const [previewData, setPreviewData] = useState([]);
  
  const handleFileUpload = async (e, forceType = '') => {
    setError('');
    setSuccess('');
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await parseFile(file);
      if (res.success) {
        setPreviewType(forceType || res.type);
        setPreviewData(res.data);
        setSuccess(`File parsed successfully as ${forceType || res.type}! Please review the data below.`);
      }
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (index, field, value) => {
    const updated = [...previewData];
    updated[index][field] = value;
    setPreviewData(updated);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (previewData.length === 0) return;

    setLoading(true);
    try {
      const res = await saveParsedData(previewType, previewData);
      if (res.success) {
        setSuccess(`Successfully saved ${res.count} records to the database.`);
        setPreviewData([]);
        setPreviewType('');
      }
    } catch (err) {
      setError(`Failed to save records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderEditableTable = () => {
    if (previewData.length === 0) return null;

    if (previewType === 'BankStatement') {
      return (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Particulars</th>
              <th>Withdrawals</th>
              <th>Deposits</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.date ? String(item.date).split('T')[0] : ''}
                    onChange={(e) => handleCellChange(idx, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.particulars || ''}
                    onChange={(e) => handleCellChange(idx, 'particulars', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.withdrawals || 0}
                    onChange={(e) => handleCellChange(idx, 'withdrawals', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.deposits || 0}
                    onChange={(e) => handleCellChange(idx, 'deposits', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.balance || 0}
                    onChange={(e) => handleCellChange(idx, 'balance', parseFloat(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (previewType === 'Invoice') {
      return (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Bill From</th>
              <th>Invoice No</th>
              <th>Due Date</th>
              <th>Description</th>
              <th>Total Due</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.billFrom || ''}
                    onChange={(e) => handleCellChange(idx, 'billFrom', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.invoiceNo || ''}
                    onChange={(e) => handleCellChange(idx, 'invoiceNo', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.dueDate ? String(item.dueDate).split('T')[0] : ''}
                    onChange={(e) => handleCellChange(idx, 'dueDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.description || ''}
                    onChange={(e) => handleCellChange(idx, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.totalDue || 0}
                    onChange={(e) => handleCellChange(idx, 'totalDue', parseFloat(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (previewType === 'Expense') {
      return (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Bill From</th>
              <th>Pay Date</th>
              <th>Pay Terms</th>
              <th>Description</th>
              <th>Total Pay</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.billFrom || ''}
                    onChange={(e) => handleCellChange(idx, 'billFrom', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.payDate ? String(item.payDate).split('T')[0] : ''}
                    onChange={(e) => handleCellChange(idx, 'payDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.payTerms || ''}
                    onChange={(e) => handleCellChange(idx, 'payTerms', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.description || ''}
                    onChange={(e) => handleCellChange(idx, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.totalPay || 0}
                    onChange={(e) => handleCellChange(idx, 'totalPay', parseFloat(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (previewType === 'Receipt') {
      return (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Bill From</th>
              <th>Payment Date</th>
              <th>Total Pay</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.invoiceNo || ''}
                    onChange={(e) => handleCellChange(idx, 'invoiceNo', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.billFrom || ''}
                    onChange={(e) => handleCellChange(idx, 'billFrom', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.paymentDate ? String(item.paymentDate).split('T')[0] : ''}
                    onChange={(e) => handleCellChange(idx, 'paymentDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    value={item.totalPay || 0}
                    onChange={(e) => handleCellChange(idx, 'totalPay', parseFloat(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="section-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Document Upload</h1>
          <p>Upload invoices, receipts, expenses, and bank statements to automate data extraction.</p>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          <span>Extraction Engine Active</span>
        </div>
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

      <div className="upload-grid">
        {/* Dropzone 1: Documents */}
        <div className="glass-card dropzone-wrapper">
          <label className="dropzone">
            <input 
              type="file" 
              accept=".pdf,.xlsx,.xls" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e)}
              disabled={loading}
            />
            <FileText className="dropzone-icon" />
            <h3>Upload Documents</h3>
            <p>Select or drag Invoice, Receipt, or Expense file (.xlsx, .pdf)</p>
          </label>
        </div>

        {/* Dropzone 2: Bank Statements */}
        <div className="glass-card dropzone-wrapper">
          <label className="dropzone">
            <input 
              type="file" 
              accept=".xlsx,.xls,.pdf" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, 'BankStatement')}
              disabled={loading}
            />
            <FileSpreadsheet className="dropzone-icon" />
            <h3>Upload Bank Statement</h3>
            <p>Select or drag Bank Statement file (.xlsx, .pdf)</p>
          </label>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Processing file and extracting data, please wait...</span>
        </div>
      )}

      {previewData.length > 0 && !loading && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              Extracted {previewType} Data Preview ({previewData.length} records)
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select 
                className="form-control" 
                style={{ width: '180px', padding: '6px 12px' }}
                value={previewType}
                onChange={(e) => setPreviewType(e.target.value)}
              >
                <option value="Invoice">Invoice</option>
                <option value="Expense">Expense</option>
                <option value="Receipt">Receipt</option>
                <option value="BankStatement">Bank Statement</option>
              </select>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} />
                Save to Database
              </button>
            </div>
          </div>
          <div className="table-container">
            {renderEditableTable()}
          </div>
        </div>
      )}
    </div>
  );
}
