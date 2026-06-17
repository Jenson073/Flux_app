const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const Approval = require('../models/Approval');

/**
 * GET /api/alerts
 * Scan for invoice due-date alerts and flagged anomaly alerts.
 */
router.get('/', async (req, res) => {
  try {
    const alerts = [];
    const today = new Date();

    // 1. Scan Invoices for Proximity Alerts
    const invoices = await Invoice.find();
    
    for (const inv of invoices) {
      // Calculate day difference
      const diffTime = inv.dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // We check if the invoice is due in 15 days or less (including overdue ones)
      if (diffDays <= 15) {
        // Find receipts for this invoiceNo
        const receipts = await Receipt.find({ invoiceNo: inv.invoiceNo });
        const totalPaid = receipts.reduce((sum, r) => sum + r.totalPay, 0);
        const remaining = inv.totalDue - totalPaid;

        // Trigger alert if there are no receipts, or if remaining balance is not zero
        if (receipts.length === 0 || remaining > 0.01) {
          alerts.push({
            id: inv._id,
            type: 'InvoiceProximity',
            title: receipts.length === 0 ? 'Unpaid Invoice Alert' : 'Partially Paid Invoice Alert',
            description: receipts.length === 0 
              ? `Invoice "${inv.invoiceNo}" is due in ${diffDays} day(s) but has no registered payment receipt.`
              : `Invoice "${inv.invoiceNo}" is due in ${diffDays} day(s) with a remaining unpaid balance of $${remaining.toFixed(2)}.`,
            documentDetails: inv,
            meta: {
              daysRemaining: diffDays,
              remainingBalance: remaining,
              receiptCount: receipts.length
            },
            severity: diffDays < 0 ? 'CRITICAL' : (diffDays <= 5 ? 'HIGH' : 'MEDIUM'),
            createdAt: inv.uploadedAt
          });
        }
      }
    }

    // 2. Fetch Flagged Anomalies ("Alerted" status)
    const alertedApprovals = await Approval.find({ type: 'Anomaly', status: 'Alerted' });
    
    for (const app of alertedApprovals) {
      // Fetch corresponding document
      let doc = null;
      if (app.details.documentType === 'Invoice') {
        doc = await Invoice.findById(app.details.documentId);
      } else if (app.details.documentType === 'Expense') {
        doc = await Expense.findById(app.details.documentId); // Wait, Expense is not imported, let's make sure it's loaded dynamically if needed, or import at top
      }

      alerts.push({
        id: app._id,
        type: 'AnomalyAlert',
        title: `Flagged Anomaly: ${app.details.anomalyType}`,
        description: `Auditor Flagged Anomaly: ${app.details.description} (Reason: ${app.reason || 'None provided'})`,
        documentDetails: doc || app.details,
        meta: {
          approvalId: app._id,
          reason: app.reason,
          anomalyType: app.details.anomalyType
        },
        severity: 'HIGH',
        createdAt: app.updatedAt
      });
    }

    // Sort alerts by severity and date
    alerts.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      if (a.severity === 'HIGH' && b.severity === 'MEDIUM') return -1;
      if (b.severity === 'HIGH' && a.severity === 'MEDIUM') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
