const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const Receipt = require('../models/Receipt');
const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');
const BankStatement = require('../models/BankStatement');
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/approvals
 * Retrieve all pending approvals, populating details for documents and bank entries.
 */
router.get('/', async (req, res) => {
  try {
    const approvals = await Approval.find({ status: 'Pending' }).sort({ createdAt: -1 });
    
    const populatedApprovals = [];
    
    for (const app of approvals) {
      const appObj = app.toObject();
      
      if (app.type === 'Match') {
        let doc = null;
        if (app.details.documentType === 'Expense') {
          doc = await Expense.findById(app.details.documentId);
        } else if (app.details.documentType === 'Receipt') {
          doc = await Receipt.findById(app.details.documentId);
        }
        
        const bankEntry = await BankStatement.findById(app.details.bankStatementEntryId);
        
        appObj.documentDetails = doc;
        appObj.bankStatementDetails = bankEntry;
      } else if (app.type === 'Anomaly') {
        let doc = null;
        if (app.details.documentType === 'Invoice') {
          doc = await Invoice.findById(app.details.documentId);
        } else if (app.details.documentType === 'Expense') {
          doc = await Expense.findById(app.details.documentId);
        }
        
        appObj.documentDetails = doc;
      }
      
      populatedApprovals.push(appObj);
    }
    
    res.json({
      success: true,
      approvals: populatedApprovals
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/approvals/:id/action
 * Approve or Reject a match or anomaly.
 */
router.post('/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject', reason: string (optional/required for rejection)
    
    if (!['approve', 'reject', 'alert'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve", "reject" or "alert".' });
    }

    if (['reject', 'alert'].includes(action) && !reason) {
      return res.status(400).json({ error: 'Reason is required for rejection/alert.' });
    }

    const approval = await Approval.findById(id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval item not found.' });
    }

    approval.status = action === 'approve' ? 'Approved' : (action === 'alert' ? 'Alerted' : 'Rejected');
    approval.reason = reason || '';
    approval.updatedAt = new Date();
    await approval.save();

    // Process cascading updates to documents based on the approval action
    let detailsStr = '';
    
    if (approval.type === 'Match') {
      const { documentId, documentType } = approval.details;
      
      // Update the document's status
      let docModel;
      if (documentType === 'Expense') docModel = Expense;
      else if (documentType === 'Receipt') docModel = Receipt;
      
      if (docModel) {
        const doc = await docModel.findById(documentId);
        if (doc) {
          doc.status = action === 'approve' ? 'Approved' : 'Pending'; // Remains Pending on rejection to allow other matches
          await doc.save();
          detailsStr = `${documentType} ID: ${documentId} (${doc.billFrom}, Amount: ${doc.totalPay})`;
        }
      }

      // Record Audit Log
      const log = new AuditLog({
        action: action === 'approve' ? 'APPROVE_MATCH' : 'REJECT_MATCH',
        details: `${action === 'approve' ? 'Approved' : 'Rejected'} match for ${detailsStr}. Confidence: ${approval.details.confidenceScore}%.${action === 'reject' ? ' Reason: ' + reason : ''}`,
        meta: { approvalId: id, documentId, documentType, action, reason }
      });
      await log.save();

    } else if (approval.type === 'Anomaly') {
      const { documentId, documentType, anomalyType } = approval.details;
      
      let docModel;
      if (documentType === 'Invoice') docModel = Invoice;
      else if (documentType === 'Expense') docModel = Expense;
      
      if (docModel) {
        const doc = await docModel.findById(documentId);
        if (doc) {
          // If anomaly is approved, we verify and approve the document. If rejected or alerted, we mark the document as rejected.
          doc.status = action === 'approve' ? 'Approved' : 'Rejected';
          await doc.save();
          detailsStr = `${documentType} ID: ${documentId} (${doc.billFrom}, Amount: ${doc.totalDue || doc.totalPay || 0})`;
        }
      }

      // Record Audit Log
      const log = new AuditLog({
        action: action === 'approve' ? 'APPROVE_ANOMALY' : (action === 'alert' ? 'ALERT_ANOMALY' : 'REJECT_ANOMALY'),
        details: `${action === 'approve' ? 'Resolved & Approved (No Risk)' : (action === 'alert' ? 'Flagged Alert!' : 'Rejected')} anomaly (${anomalyType}) for ${detailsStr}.${action !== 'approve' ? ' Reason: ' + reason : ''}`,
        meta: { approvalId: id, documentId, documentType, anomalyType, action, reason }
      });
      await log.save();
    }

    res.json({
      success: true,
      message: `Approval item ${action === 'approve' ? 'approved' : (action === 'alert' ? 'alerted' : 'rejected')} successfully.`,
      data: approval
    });

  } catch (error) {
    console.error('Error processing approval action:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
