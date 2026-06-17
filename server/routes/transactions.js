const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const BankStatement = require('../models/BankStatement');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/transactions
 * Fetch all invoices, expenses, and receipts.
 */
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ uploadedAt: -1 });
    const expenses = await Expense.find().sort({ uploadedAt: -1 });
    const receipts = await Receipt.find().sort({ uploadedAt: -1 });
    
    res.json({
      success: true,
      invoices,
      expenses,
      receipts
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/transactions/:type/:id
 * Delete a specific document and log the action.
 */
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let deletedDoc;
    
    if (type === 'invoice') {
      deletedDoc = await Invoice.findByIdAndDelete(id);
    } else if (type === 'expense') {
      deletedDoc = await Expense.findByIdAndDelete(id);
    } else if (type === 'receipt') {
      deletedDoc = await Receipt.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    if (!deletedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log deletion event
    const log = new AuditLog({
      action: `DELETE_${type.toUpperCase()}`,
      details: `Deleted ${type} from ${deletedDoc.billFrom || 'Unknown'}. Amount: ${deletedDoc.totalDue || deletedDoc.totalPay || 0}`,
      meta: { id, type, document: deletedDoc }
    });
    await log.save();

    res.json({
      success: true,
      message: 'Document deleted successfully',
      data: deletedDoc
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions/bank-statement
 * Retrieve all bank statement entries.
 */
router.get('/bank-statement', async (req, res) => {
  try {
    const entries = await BankStatement.find().sort({ date: -1 });
    res.json({
      success: true,
      bankStatement: entries
    });
  } catch (error) {
    console.error('Error fetching bank statement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions/download/:fileName
 * Expose download endpoint for file system files with fallback.
 */
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const localPath = path.join(__dirname, '../uploads', fileName);
    const downloadsPath = path.join('/home/user/Downloads', fileName);
    
    if (fs.existsSync(localPath)) {
      return res.download(localPath);
    } else if (fs.existsSync(downloadsPath)) {
      return res.download(downloadsPath);
    } else {
      // Create a fallback mockup file contents on the fly
      res.setHeader('Content-disposition', `attachment; filename=${fileName.replace(/\.pdf$/i, '.txt')}`);
      res.setHeader('Content-type', 'text/plain');
      res.write(`LedgerAI Accounting Automation System - Mock Document\n`);
      res.write(`=====================================================\n`);
      res.write(`Filename: ${fileName}\n`);
      res.write(`Generated: ${new Date().toLocaleString()}\n`);
      res.write(`Notice: The file binary was not found in local directories.\n`);
      res.write(`This mockup acts as a verified placeholder in your ledger system.\n`);
      return res.end();
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/transactions/:type/:id
 * Edit transaction details and recompute linked values.
 */
router.put('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const updateData = req.body;
    let updatedDoc;
    
    if (type === 'invoice') {
      updatedDoc = await Invoice.findByIdAndUpdate(id, updateData, { new: true });
      if (updatedDoc) {
        // Recalculate remaining for any receipts matching this invoice
        const matchingReceipts = await Receipt.find({ invoiceNo: updatedDoc.invoiceNo });
        for (const rec of matchingReceipts) {
          // Re-sum other receipt pays
          const otherReceipts = await Receipt.find({ invoiceNo: updatedDoc.invoiceNo, _id: { $ne: rec._id } });
          const totalOtherPaid = otherReceipts.reduce((sum, r) => sum + r.totalPay, 0);
          rec.remaining = Math.max(0, updatedDoc.totalDue - (totalOtherPaid + rec.totalPay));
          rec.status = rec.remaining > 0 ? 'Partial Pay' : 'Pending';
          await rec.save();
        }
      }
    } else if (type === 'expense') {
      updatedDoc = await Expense.findByIdAndUpdate(id, updateData, { new: true });
    } else if (type === 'receipt') {
      const invoiceNo = updateData.invoiceNo || (await Receipt.findById(id))?.invoiceNo;
      const totalPay = parseFloat(updateData.totalPay) || 0;
      
      let remaining = 0;
      const matchingInvoice = await Invoice.findOne({ invoiceNo });
      if (matchingInvoice) {
        const otherReceipts = await Receipt.find({ invoiceNo, _id: { $ne: id } });
        const totalOtherPaid = otherReceipts.reduce((sum, r) => sum + r.totalPay, 0);
        remaining = Math.max(0, matchingInvoice.totalDue - (totalOtherPaid + totalPay));
      }
      
      updateData.remaining = remaining;
      updateData.status = remaining > 0 ? 'Partial Pay' : 'Pending';
      
      updatedDoc = await Receipt.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    if (!updatedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Log the edit
    const log = new AuditLog({
      action: `EDIT_${type.toUpperCase()}`,
      details: `Modified ${type} details for ${updatedDoc.billFrom || 'Unknown'}. New Amount: ${updatedDoc.totalDue || updatedDoc.totalPay || 0}`,
      meta: { id, type, update: updateData }
    });
    await log.save();
    
    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDoc
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions/matched
 * Retrieve all approved reconciliations.
 */
router.get('/matched', async (req, res) => {
  try {
    const approvals = await Approval.find({ type: 'Match', status: 'Approved' });
    const list = [];
    
    for (const app of approvals) {
      let doc = null;
      if (app.details.documentType === 'Expense') {
        doc = await Expense.findById(app.details.documentId);
      } else {
        doc = await Receipt.findById(app.details.documentId);
      }
      
      const bankEntry = await BankStatement.findById(app.details.bankStatementEntryId);
      
      list.push({
        approvalId: app._id,
        documentType: app.details.documentType,
        document: doc,
        bankEntry,
        confidenceScore: app.details.confidenceScore,
        approvedAt: app.updatedAt
      });
    }
    
    res.json({
      success: true,
      matched: list
    });
  } catch (error) {
    console.error('Error fetching matched transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


