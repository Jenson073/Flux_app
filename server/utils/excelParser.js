const xlsx = require('xlsx');

const parseNumber = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

const parseDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  
  // SheetJS sometimes reads dates as serial numbers
  if (typeof val === 'number') {
    return new Date((val - 25569) * 86400 * 1000);
  }
  
  const parsed = Date.parse(val);
  return isNaN(parsed) ? new Date() : new Date(parsed);
};

const detectSheetType = (headers) => {
  const headersLower = headers.map(h => String(h).toLowerCase());
  
  // Bank Statement: contains deposits, withdrawals, balance, etc.
  if (headersLower.some(h => h.includes('deposit') || h.includes('withdrawal') || h.includes('balance'))) {
    return 'BankStatement';
  }
  
  // Invoice: contains due date, total due
  if (headersLower.some(h => h.includes('due date') || h.includes('total due'))) {
    return 'Invoice';
  }
  
  // Receipt: contains payment date, remaining, invoice no
  if (headersLower.some(h => h.includes('payment date') || h.includes('remaining') || (h.includes('invoice no') && h.includes('receipt')))) {
    return 'Receipt';
  }
  
  // Expense: contains pay date, pay terms, total pay
  if (headersLower.some(h => h.includes('pay date') || h.includes('pay terms') || h.includes('total pay'))) {
    return 'Expense';
  }
  
  // Fallbacks based on invoice no presence
  if (headersLower.some(h => h.includes('invoice no'))) {
    return 'Invoice';
  }
  
  return 'Expense'; // Default fallback
};

const parseExcel = (buffer, fileName = '') => {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Get raw JSON rows
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (rawRows.length === 0) {
    throw new Error('Excel sheet is empty');
  }
  
  // Extract headers
  const headers = Object.keys(rawRows[0]);
  const type = detectSheetType(headers);
  
  // Helper to find key in row case-insensitively
  const findValue = (row, fieldName) => {
    const key = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === fieldName.toLowerCase().replace(/\s+/g, ''));
    return key ? row[key] : null;
  };
  
  if (type === 'BankStatement') {
    const entries = [];
    rawRows.forEach(row => {
      const dateVal = findValue(row, 'date');
      const particularsVal = findValue(row, 'particulars') || '';
      const withdrawalsVal = parseNumber(findValue(row, 'withdrawals'));
      const depositsVal = parseNumber(findValue(row, 'deposits'));
      const balanceVal = parseNumber(findValue(row, 'balance'));
      
      // Only process valid rows with date and balance
      if (dateVal && (withdrawalsVal || depositsVal || balanceVal)) {
        let paymentTerm = 'Bank Transfer';
        if (String(particularsVal).toLowerCase().includes('upi')) {
          paymentTerm = 'UPI';
        } else if (String(particularsVal).toLowerCase().includes('cash')) {
          paymentTerm = 'Cash';
        }
        
        entries.push({
          date: parseDate(dateVal),
          particulars: String(particularsVal),
          paymentTerm,
          withdrawals: withdrawalsVal,
          deposits: depositsVal,
          balance: balanceVal,
          fileName
        });
      }
    });
    
    return { type, data: entries };
  }
  
  if (type === 'Invoice') {
    // Excel sheets for invoices might be tabular (multiple invoices in a table)
    // or a single invoice. We'll handle both, returning an array of items.
    const items = rawRows.map(row => {
      return {
        billFrom: String(findValue(row, 'billfrom') || 'Unknown Supplier'),
        invoiceNo: String(findValue(row, 'invoiceno') || 'INV-' + Math.floor(Math.random() * 100000)),
        dueDate: parseDate(findValue(row, 'duedate') || findValue(row, 'date')),
        description: String(findValue(row, 'description') || 'Office Services'),
        totalDue: parseNumber(findValue(row, 'totaldue') || findValue(row, 'amount') || findValue(row, 'total')),
        fileName
      };
    });
    
    return { type, data: items };
  }
  
  if (type === 'Receipt') {
    const items = rawRows.map(row => {
      return {
        invoiceNo: String(findValue(row, 'invoiceno') || 'N/A'),
        billFrom: String(findValue(row, 'billfrom') || 'Unknown Supplier'),
        paymentDate: parseDate(findValue(row, 'paymentdate') || findValue(row, 'date')),
        totalPay: parseNumber(findValue(row, 'totalpay') || findValue(row, 'payment') || findValue(row, 'amount')),
        remaining: parseNumber(findValue(row, 'remaining') || 0),
        fileName
      };
    });
    
    return { type, data: items };
  }
  
  if (type === 'Expense') {
    const items = rawRows.map(row => {
      return {
        billFrom: String(findValue(row, 'billfrom') || 'Unknown Merchant'),
        payDate: parseDate(findValue(row, 'paydate') || findValue(row, 'date')),
        payTerms: String(findValue(row, 'payterms') || 'UPI'),
        description: String(findValue(row, 'description') || 'Business Expense'),
        totalPay: parseNumber(findValue(row, 'totalpay') || findValue(row, 'amount')),
        fileName
      };
    });
    
    return { type, data: items };
  }
};

module.exports = {
  parseExcel
};
