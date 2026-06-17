const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const { parsePDF } = require('../utils/pdfParser');
const { parseExcel } = require('../utils/excelParser');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const BankStatement = require('../models/BankStatement');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');

// Set up Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/upload/parse
 * Upload a document (pdf/xlsx) and extract data without saving to DB.
 */
router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    const extension = originalname.split('.').pop().toLowerCase();
    
    // Write uploaded buffer to disk for downloads
    const filePath = path.join(UPLOADS_DIR, originalname);
    fs.writeFileSync(filePath, buffer);
    
    let parsedResult;
    
    if (extension === 'pdf') {
      parsedResult = await parsePDF(buffer, originalname);
    } else if (extension === 'xlsx' || extension === 'xls') {
      parsedResult = parseExcel(buffer, originalname);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a .pdf or .xlsx file' });
    }

    // Log parsing event in audit logs
    const log = new AuditLog({
      action: 'PARSE_FILE',
      details: `Parsed file: ${originalname} of type: ${parsedResult.type}`,
      meta: { fileName: originalname, type: parsedResult.type }
    });
    await log.save();

    res.json({
      success: true,
      type: parsedResult.type,
      data: parsedResult.data
    });
  } catch (error) {
    console.error('File parsing error:', error);
    res.status(500).json({ error: `Parsing failed: ${error.message}` });
  }
});

/**
 * POST /api/upload/save
 * Save parsed and reviewed items to database.
 */
router.post('/save', async (req, res) => {
  try {
    const { type, items } = req.body;
    
    if (!type || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload. Expecting type and items array.' });
    }

    const savedRecords = [];
    
    if (type === 'BankStatement') {
      // 1. Delete previous statement records (Single Statement Rule)
      const deletedCount = await BankStatement.deleteMany({});
      
      // 2. Delete all pending approvals relating to bank statements since the statement changed
      await Approval.deleteMany({ type: 'Match', status: 'Pending' });

      // 3. Save new statement records
      for (const item of items) {
        const bs = new BankStatement({
          date: new Date(item.date),
          particulars: item.particulars,
          paymentTerm: item.paymentTerm || '',
          withdrawals: parseFloat(item.withdrawals) || 0,
          deposits: parseFloat(item.deposits) || 0,
          balance: parseFloat(item.balance) || 0,
          fileName: item.fileName
        });
        await bs.save();
        savedRecords.push(bs);
      }

      // Log replacement in audit logs
      const log = new AuditLog({
        action: 'REPLACE_BANK_STATEMENT',
        details: `Replaced bank statement with new entries. Deleted ${deletedCount.deletedCount} old records. Inserted ${items.length} new records.`,
        meta: { deleted: deletedCount.deletedCount, inserted: items.length, fileName: items[0]?.fileName }
      });
      await log.save();

    } else if (type === 'Invoice') {
      for (const item of items) {
        const inv = new Invoice({
          billFrom: item.billFrom,
          invoiceNo: item.invoiceNo,
          dueDate: new Date(item.dueDate),
          description: item.description,
          totalDue: parseFloat(item.totalDue) || 0,
          fileName: item.fileName,
          status: 'Pending'
        });
        await inv.save();
        savedRecords.push(inv);
      }

      // Log in audit logs
      const log = new AuditLog({
        action: 'UPLOAD_INVOICES',
        details: `Saved ${items.length} invoice(s) to database.`,
        meta: { count: items.length }
      });
      await log.save();

    } else if (type === 'Expense') {
      for (const item of items) {
        const exp = new Expense({
          billFrom: item.billFrom,
          payDate: new Date(item.payDate),
          payTerms: item.payTerms || 'UPI',
          description: item.description,
          totalPay: parseFloat(item.totalPay) || 0,
          fileName: item.fileName,
          status: 'Pending'
        });
        await exp.save();
        savedRecords.push(exp);
      }

      // Log in audit logs
      const log = new AuditLog({
        action: 'UPLOAD_EXPENSES',
        details: `Saved ${items.length} expense record(s) to database.`,
        meta: { count: items.length }
      });
      await log.save();

    } else if (type === 'Receipt') {
      for (const item of items) {
        // Calculate remaining -> match invoiceNo, subtract totalDue and totalPay. Min 0, 0 if no match
        let remaining = 0;
        const matchingInvoice = await Invoice.findOne({ invoiceNo: item.invoiceNo });
        if (matchingInvoice) {
          // Find all existing receipts for this invoice
          const otherReceipts = await Receipt.find({ invoiceNo: item.invoiceNo });
          const totalOtherPaid = otherReceipts.reduce((sum, r) => sum + r.totalPay, 0);
          remaining = Math.max(0, matchingInvoice.totalDue - (totalOtherPaid + item.totalPay));
        }

        const rec = new Receipt({
          invoiceNo: item.invoiceNo,
          billFrom: item.billFrom,
          paymentDate: new Date(item.paymentDate),
          totalPay: parseFloat(item.totalPay) || 0,
          remaining: remaining,
          fileName: item.fileName,
          status: remaining > 0 ? 'Partial Pay' : 'Pending'
        });
        await rec.save();
        savedRecords.push(rec);
      }

      // Log in audit logs
      const log = new AuditLog({
        action: 'UPLOAD_RECEIPTS',
        details: `Saved ${items.length} receipt(s) to database.`,
        meta: { count: items.length }
      });
      await log.save();
    }

    res.json({
      success: true,
      count: savedRecords.length,
      data: savedRecords
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: `Saving failed: ${error.message}` });
  }
});

module.exports = router;
