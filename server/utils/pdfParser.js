const { PDFParse } = require('pdf-parse');

/**
 * Clean numeric string and convert to number
 */
const parseNumber = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
};

/**
 * Parse date strings into JavaScript Date objects
 */
const parseDate = (str) => {
  if (!str) return new Date();
  
  // Clean string
  const cleanStr = str.trim();
  
  // Format: 13-May-2026
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(cleanStr)) {
    return new Date(cleanStr);
  }
  
  // Format: 2026-06-10
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return new Date(cleanStr);
  }

  const parsed = Date.parse(cleanStr);
  return isNaN(parsed) ? new Date() : new Date(parsed);
};

/**
 * Classify and extract data from pdf text
 */
const extractDataFromText = (text, fileName = '') => {
  const textLower = text.toLowerCase();
  
  // 1. Check if it's a Bank Statement
  if (textLower.includes('bank statement') || textLower.includes('statement for account') || textLower.includes('opening balance')) {
    return parseBankStatement(text, fileName);
  }
  
  // 2. Check if it's a Sales Receipt
  if (textLower.includes('sales receipt') || (textLower.includes('receipt') && !textLower.includes('invoice'))) {
    return parseReceipt(text, fileName);
  }
  
  // 3. Check if it's an Invoice
  if (textLower.includes('invoice')) {
    return parseInvoice(text, fileName);
  }
  
  // 4. Default to Expense if not matched, or verify if it contains Expense terms
  return parseExpense(text, fileName);
};

/**
 * Parse Bank Statement text
 */
const parseBankStatement = (text, fileName) => {
  const entries = [];
  
  // Find opening balance
  let runningBalance = 0;
  const openBalMatch = text.match(/Opening\s+Balance\s+([\d,]+\.\d{2})/i);
  if (openBalMatch) {
    runningBalance = parseNumber(openBalMatch[1]);
  }
  
  // Match rows. Format: Date Particulars Withdrawals Deposits Balance
  // E.g. 13-May-2026 UPI/215077377622/P JOHNY SAMDAS/SBIN/Payment from 5,000.00 6,554.79
  // Regex to match date (e.g. 13-May-2026 or 13-05-2026) followed by text and then two currency figures at the end
  const rowRegex = /(\d{1,2}-[A-Za-z]{3}-\d{4}|\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
  
  let match;
  let prevBalance = runningBalance;
  
  while ((match = rowRegex.exec(text)) !== null) {
    const dateStr = match[1];
    const particulars = match[2].trim();
    const amountVal = parseNumber(match[3]);
    const balanceVal = parseNumber(match[4]);
    
    // Determine if deposit or withdrawal using the change in running balance
    let withdrawals = 0;
    let deposits = 0;
    
    // If running balance is zero, we try to guess based on particulars or set first balance
    if (prevBalance === 0) {
      prevBalance = balanceVal - amountVal; // assume it was a deposit first
    }
    
    // Calculate difference
    const diff = balanceVal - prevBalance;
    
    if (Math.abs(diff - amountVal) < 0.01) {
      deposits = amountVal;
    } else if (Math.abs(diff + amountVal) < 0.01) {
      withdrawals = amountVal;
    } else {
      // Fallback fallback if running balance check is off (e.g. missing rows)
      if (particulars.toLowerCase().includes('payment from') || particulars.toLowerCase().includes('deposit') || particulars.toLowerCase().includes('received')) {
        deposits = amountVal;
      } else {
        withdrawals = amountVal;
      }
    }
    
    // Determine payment term (e.g., UPI, IMPS, Card, Cash)
    let paymentTerm = 'Bank Transfer';
    if (particulars.toLowerCase().includes('upi')) {
      paymentTerm = 'UPI';
    } else if (particulars.toLowerCase().includes('rtgs') || particulars.toLowerCase().includes('neft')) {
      paymentTerm = 'Bank Transfer';
    } else if (particulars.toLowerCase().includes('cash')) {
      paymentTerm = 'Cash';
    }
    
    entries.push({
      date: parseDate(dateStr),
      particulars,
      paymentTerm,
      withdrawals,
      deposits,
      balance: balanceVal,
      fileName
    });
    
    prevBalance = balanceVal;
  }
  
  return {
    type: 'BankStatement',
    data: entries
  };
};

/**
 * Parse Invoice text
 */
const parseInvoice = (text, fileName) => {
  // Bill from: Look for BILL FROM: followed by lines until BILL TO or invoice details
  let billFrom = 'Owner';
  const billFromMatch = text.match(/BILL FROM:\s*([^\n\r]+)/i);
  if (billFromMatch) {
    billFrom = billFromMatch[1].trim();
  }
  
  // Invoice no
  let invoiceNo = 'INV-' + Math.floor(Math.random() * 100000);
  const invoiceNoMatch = text.match(/Invoice\s*(?:no|#)\s*:\s*([^\s\n\r]+)/i);
  if (invoiceNoMatch) {
    invoiceNo = invoiceNoMatch[1].trim();
  }
  
  // Due date
  let dueDate = new Date();
  const dueDateMatch = text.match(/Due\s*Date\s*:\s*([\d\-\/]+)/i);
  if (dueDateMatch) {
    dueDate = parseDate(dueDateMatch[1]);
  } else {
    // If not found, look for date and add 30 days
    const dateMatch = text.match(/Date\s*:\s*([\d\-\/]+)/i);
    if (dateMatch) {
      dueDate = parseDate(dateMatch[1]);
      dueDate.setDate(dueDate.getDate() + 30);
    }
  }
  
  // Description (items)
  let description = 'Office Services / Products';
  const descBlockMatch = text.match(/Description\s+Price\s+QTY\s+Total\n([\s\S]+?)\nSubtotal/i);
  if (descBlockMatch) {
    const lines = descBlockMatch[1].split('\n').map(l => l.trim()).filter(l => l);
    // Grab descriptions from lines
    const items = lines.map(line => {
      // Match text up to currency symbol or number
      const itemMatch = line.match(/^([^\$0-9]+)/);
      return itemMatch ? itemMatch[1].trim() : line;
    });
    description = items.join(', ');
  }
  
  // Total Due
  let totalDue = 0;
  const totalMatch = text.match(/Total\s*Due\s*\$?([\d,\.]+)/i);
  if (totalMatch) {
    totalDue = parseNumber(totalMatch[1]);
  } else {
    // try matching just Total
    const totalMatch2 = text.match(/Total\s*\$?([\d,\.]+)/i);
    if (totalMatch2) {
      totalDue = parseNumber(totalMatch2[1]);
    }
  }
  
  return {
    type: 'Invoice',
    data: [{ billFrom, invoiceNo, dueDate, description, totalDue, fileName }]
  };
};

/**
 * Parse Receipt text
 */
const parseReceipt = (text, fileName) => {
  let billFrom = 'Owner';
  const billFromMatch = text.match(/BILL FROM:\s*([^\n\r]+)/i);
  if (billFromMatch) {
    billFrom = billFromMatch[1].trim();
  }
  
  let invoiceNo = 'N/A';
  const invoiceNoMatch = text.match(/Invoice\s*(?:no|#)\s*:\s*([^\s\n\r]+)/i);
  if (invoiceNoMatch) {
    invoiceNo = invoiceNoMatch[1].trim();
  }
  
  let paymentDate = new Date();
  const dateMatch = text.match(/Date\s*:\s*([\d\-\/]+)/i);
  if (dateMatch) {
    paymentDate = parseDate(dateMatch[1]);
  }
  
  let totalPay = 0;
  // Look for Payment or Total Due
  const paymentMatch = text.match(/Payment\s*\$?([\d,\.]+)/i);
  if (paymentMatch) {
    totalPay = parseNumber(paymentMatch[1]);
  } else {
    const totalMatch = text.match(/Total\s*Due\s*\$?([\d,\.]+)/i);
    if (totalMatch) {
      totalPay = parseNumber(totalMatch[1]);
    }
  }
  
  return {
    type: 'Receipt',
    data: [{ invoiceNo, billFrom, paymentDate, totalPay, remaining: 0, fileName }]
  };
};

/**
 * Parse Expense text
 */
const parseExpense = (text, fileName) => {
  let billFrom = 'Vendor';
  const billFromMatch = text.match(/BILL FROM:\s*([^\n\r]+)/i) || text.match(/Merchant:\s*([^\n\r]+)/i);
  if (billFromMatch) {
    billFrom = billFromMatch[1].trim();
  }
  
  let payDate = new Date();
  const dateMatch = text.match(/Pay\s*Date\s*:\s*([\d\-\/]+)/i) || text.match(/Date\s*:\s*([\d\-\/]+)/i);
  if (dateMatch) {
    payDate = parseDate(dateMatch[1]);
  }
  
  let payTerms = 'UPI';
  const payTermsMatch = text.match(/Payment\s*Terms\s*:\s*([^\n\r]+)/i) || text.match(/Pay\s*Terms\s*:\s*([^\n\r]+)/i);
  if (payTermsMatch) {
    payTerms = payTermsMatch[1].trim();
  }
  
  let description = 'Business Expense';
  const descBlockMatch = text.match(/Description\s+Price\s+QTY\s+Total\n([\s\S]+?)\nSubtotal/i);
  if (descBlockMatch) {
    const lines = descBlockMatch[1].split('\n').map(l => l.trim()).filter(l => l);
    const items = lines.map(line => {
      const itemMatch = line.match(/^([^\$0-9]+)/);
      return itemMatch ? itemMatch[1].trim() : line;
    });
    description = items.join(', ');
  }
  
  let totalPay = 0;
  const paymentMatch = text.match(/(?:Total\s*Pay|Total\s*Due|Total|Payment)\s*\$?([\d,\.]+)/i);
  if (paymentMatch) {
    totalPay = parseNumber(paymentMatch[1]);
  }
  
  return {
    type: 'Expense',
    data: [{ billFrom, payDate, payTerms, description, totalPay, fileName }]
  };
};

/**
 * Main parser function to parse PDF files
 */
const parsePDF = async (buffer, fileName = '') => {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  return extractDataFromText(result.text, fileName);
};

module.exports = {
  parsePDF,
  extractDataFromText
};
