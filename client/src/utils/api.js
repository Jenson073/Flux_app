const API_BASE_URL = 'http://localhost:5000/api';

export const parseFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/upload/parse`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Parsing failed');
  }
  return response.json();
};

export const saveParsedData = async (type, items) => {
  const response = await fetch(`${API_BASE_URL}/upload/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, items }),
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to save data');
  }
  return response.json();
};

export const getTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
};

export const deleteTransaction = async (type, id) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${type}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to delete transaction');
  }
  return response.json();
};

export const getMatches = async () => {
  const response = await fetch(`${API_BASE_URL}/matches`);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
};

export const passMatchToApproval = async (data) => {
  const response = await fetch(`${API_BASE_URL}/matches/pass-to-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to pass match to approval');
  }
  return response.json();
};

export const getApprovals = async () => {
  const response = await fetch(`${API_BASE_URL}/approvals`);
  if (!response.ok) throw new Error('Failed to fetch approvals');
  return response.json();
};

export const processApprovalAction = async (id, action, reason) => {
  const response = await fetch(`${API_BASE_URL}/approvals/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to process approval action');
  }
  return response.json();
};

export const getAnomalies = async () => {
  const response = await fetch(`${API_BASE_URL}/anomalies`);
  if (!response.ok) throw new Error('Failed to fetch anomalies');
  return response.json();
};

export const passAnomalyToApproval = async (data) => {
  const response = await fetch(`${API_BASE_URL}/anomalies/pass-to-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to pass anomaly to approval');
  }
  return response.json();
};

export const getCategoriseTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/categorize`);
  if (!response.ok) throw new Error('Failed to fetch categorization list');
  return response.json();
};

export const confirmCategorisation = async (data) => {
  const response = await fetch(`${API_BASE_URL}/categorize/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to confirm category');
  }
  return response.json();
};

export const getAuditLogs = async () => {
  const response = await fetch(`${API_BASE_URL}/audit-logs`);
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
};

export const getBankStatement = async () => {
  const response = await fetch(`${API_BASE_URL}/transactions/bank-statement`);
  if (!response.ok) throw new Error('Failed to fetch bank statement');
  return response.json();
};

export const getMatchedTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/transactions/matched`);
  if (!response.ok) throw new Error('Failed to fetch matched transactions');
  return response.json();
};

export const editTransaction = async (type, id, data) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${type}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to update transaction');
  }
  return response.json();
};

export const passAllMatches = async () => {
  const response = await fetch(`${API_BASE_URL}/matches/pass-all`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to pass all matches to approval');
  }
  return response.json();
};

export const getAlerts = async () => {
  const response = await fetch(`${API_BASE_URL}/alerts`);
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
};

