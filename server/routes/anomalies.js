const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');

/**
 * Category suggestion helper
 */
const suggestCategory = (description) => {
  if (!description) return 'Miscellaneous';
  const desc = description.toLowerCase();
  
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage') || desc.includes('employee')) {
    return 'Payroll Expense';
  }
  if (desc.includes('electricity') || desc.includes('power') || desc.includes('utility') || desc.includes('utilities') || desc.includes('water') || desc.includes('juice') || desc.includes('internet') || desc.includes('bill')) {
    return 'Bill Utilities';
  }
  if (desc.includes('office') || desc.includes('supply') || desc.includes('supplies') || desc.includes('purchase') || desc.includes('stationery') || desc.includes('dress') || desc.includes('treat') || desc.includes('food') || desc.includes('lunch')) {
    return 'Office Expenses';
  }
  if (desc.includes('customer') || desc.includes('sales') || desc.includes('revenue') || desc.includes('payment from') || desc.includes('sam')) {
    return 'Sales Revenue';
  }
  return 'Office Expenses'; // Safe default
};

/**
 * GET /api/anomalies
 * Detect anomalies: duplicate invoices, unusually large category expenses.
 */
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    const expenses = await Expense.find();
    const existingApprovals = await Approval.find({ type: 'Anomaly' });
    
    // Create mapping of processed approvals to avoid duplicate suggestions
    const processedMap = new Set();
    existingApprovals.forEach(app => {
      if (app.details.documentId) {
        processedMap.add(app.details.documentId.toString());
      }
    });

    const anomalies = [];

    // 1. Detect Duplicate Invoices
    // Look for duplicate invoice numbers, or same supplier + amount
    const invoiceNoCounts = {};
    const invoiceBillAmtCounts = {};

    invoices.forEach(inv => {
      const invNo = inv.invoiceNo.toLowerCase().trim();
      const billAmtKey = `${inv.billFrom.toLowerCase().trim()}_${inv.totalDue}`;
      
      invoiceNoCounts[invNo] = (invoiceNoCounts[invNo] || 0) + 1;
      invoiceBillAmtCounts[billAmtKey] = (invoiceBillAmtCounts[billAmtKey] || 0) + 1;
    });

    invoices.forEach(inv => {
      const invNo = inv.invoiceNo.toLowerCase().trim();
      const billAmtKey = `${inv.billFrom.toLowerCase().trim()}_${inv.totalDue}`;
      
      let isDuplicate = false;
      let reason = '';

      if (invoiceNoCounts[invNo] > 1 && inv.invoiceNo !== 'N/A') {
        isDuplicate = true;
        reason = `Duplicate Invoice Number: "${inv.invoiceNo}" detected multiple times.`;
      } else if (invoiceBillAmtCounts[billAmtKey] > 1) {
        isDuplicate = true;
        reason = `Duplicate Invoice: Same supplier ("${inv.billFrom}") and amount ($${inv.totalDue}) detected.`;
      }

      if (isDuplicate) {
        const hasPassedToApproval = processedMap.has(inv._id.toString());
        const approvalItem = existingApprovals.find(a => a.details.documentId?.toString() === inv._id.toString());
        
        anomalies.push({
          type: 'DuplicateInvoice',
          document: inv,
          documentType: 'Invoice',
          description: reason,
          status: approvalItem ? approvalItem.status : 'New', // 'New', 'Pending', 'Approved', 'Rejected'
          approvalId: approvalItem ? approvalItem._id : null
        });
      }
    });

    // 2. Detect High Category Expenses (>1.5x average, or >$5000)
    // Group expenses by category
    const expByCategory = {};
    expenses.forEach(exp => {
      const category = suggestCategory(exp.description);
      if (!expByCategory[category]) {
        expByCategory[category] = [];
      }
      expByCategory[category].push(exp);
    });

    // Calculate averages
    const categoryAverages = {};
    Object.keys(expByCategory).forEach(cat => {
      const list = expByCategory[cat];
      const sum = list.reduce((total, e) => total + e.totalPay, 0);
      categoryAverages[cat] = {
        avg: sum / list.length,
        count: list.length
      };
    });

    expenses.forEach(exp => {
      const category = suggestCategory(exp.description);
      const catStats = categoryAverages[category];
      
      let isAnomaly = false;
      let reason = '';
      
      // Anomaly if > 1.5x average (with at least 3 items in category) or absolute high value
      if (catStats.count >= 3 && exp.totalPay > 1.5 * catStats.avg) {
        isAnomaly = true;
        reason = `High Expense: Amount $${exp.totalPay} is ${Math.round((exp.totalPay / catStats.avg) * 10) / 10}x higher than the category average of $${Math.round(catStats.avg * 100) / 100} for "${category}".`;
      } else if (exp.totalPay >= 5000) {
        isAnomaly = true;
        reason = `Large Expense: Absolute transaction amount $${exp.totalPay} exceeds the high expense threshold of $5000.`;
      }

      if (isAnomaly) {
        const hasPassedToApproval = processedMap.has(exp._id.toString());
        const approvalItem = existingApprovals.find(a => a.details.documentId?.toString() === exp._id.toString());

        anomalies.push({
          type: 'HighExpense',
          document: exp,
          documentType: 'Expense',
          description: reason,
          status: approvalItem ? approvalItem.status : 'New',
          approvalId: approvalItem ? approvalItem._id : null
        });
      }
    });

    res.json({
      success: true,
      anomalies
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/anomalies/pass-to-approval
 * Pass a detected anomaly to the approval queue.
 */
router.post('/pass-to-approval', async (req, res) => {
  try {
    const { documentId, documentType, anomalyType, description } = req.body;

    if (!documentId || !documentType || !anomalyType || !description) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if it's already in the approval queue
    const existing = await Approval.findOne({
      type: 'Anomaly',
      'details.documentId': documentId,
      'details.anomalyType': anomalyType
    });

    if (existing) {
      return res.status(400).json({ error: 'Anomaly already exists in the approval queue or is processed' });
    }

    const approval = new Approval({
      type: 'Anomaly',
      status: 'Pending',
      details: {
        documentId,
        documentType,
        anomalyType,
        description
      }
    });

    await approval.save();

    // Create Audit Log
    const log = new AuditLog({
      action: 'PASS_ANOMALY_TO_APPROVAL',
      details: `Passed detected anomaly (${anomalyType}: ${description}) to Approval queue.`,
      meta: { approvalId: approval._id, documentId, documentType, anomalyType }
    });
    await log.save();

    res.json({
      success: true,
      message: 'Anomaly passed to approval queue successfully',
      data: approval
    });
  } catch (error) {
    console.error('Error passing anomaly to approval:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
exportSuggestCategory = suggestCategory; // Export for categorization route
