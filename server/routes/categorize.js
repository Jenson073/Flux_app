const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
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
  return 'Office Expenses'; // Default
};

/**
 * GET /api/categorize
 * Fetch all categorizable documents (Invoices, Receipts & Expenses) with suggestions.
 */
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ dueDate: -1 });
    const receipts = await Receipt.find().sort({ paymentDate: -1 });
    const expenses = await Expense.find().sort({ payDate: -1 });

    const list = [];

    invoices.forEach(inv => {
      const category = inv.category || suggestCategory(inv.description);
      list.push({
        id: inv._id,
        type: 'Invoice',
        date: inv.dueDate,
        description: `Invoice: ${inv.invoiceNo} - ${inv.description}`,
        amount: -inv.totalDue,
        category,
        categoryStatus: inv.categoryStatus || 'Suggested'
      });
    });

    receipts.forEach(rec => {
      const category = rec.category || suggestCategory(rec.billFrom);
      list.push({
        id: rec._id,
        type: 'Receipt',
        date: rec.paymentDate,
        description: `Receipt: Payment for ${rec.invoiceNo} from ${rec.billFrom}`,
        amount: rec.totalPay,
        category,
        categoryStatus: rec.categoryStatus || 'Suggested'
      });
    });

    expenses.forEach(exp => {
      const category = exp.category || suggestCategory(exp.description);
      list.push({
        id: exp._id,
        type: 'Expense',
        date: exp.payDate,
        description: `Expense: ${exp.billFrom} - ${exp.description}`,
        amount: -exp.totalPay,
        category,
        categoryStatus: exp.categoryStatus || 'Suggested'
      });
    });

    res.json({
      success: true,
      transactions: list
    });
  } catch (error) {
    console.error('Error in categorize list:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categorize/confirm
 * Confirm or update a suggested category.
 */
router.post('/confirm', async (req, res) => {
  try {
    const { id, type, category } = req.body;

    if (!id || !type || !category) {
      return res.status(400).json({ error: 'Missing id, type or category' });
    }

    let item;
    let description = '';
    let amount = 0;

    if (type === 'Invoice') {
      item = await Invoice.findById(id);
      if (item) {
        item.category = category;
        item.categoryStatus = 'Confirmed';
        await item.save();
        description = `Invoice: ${item.invoiceNo}`;
        amount = -item.totalDue;
      }
    } else if (type === 'Receipt') {
      item = await Receipt.findById(id);
      if (item) {
        item.category = category;
        item.categoryStatus = 'Confirmed';
        await item.save();
        description = `Receipt: Payment for ${item.invoiceNo}`;
        amount = item.totalPay;
      }
    } else if (type === 'Expense') {
      item = await Expense.findById(id);
      if (item) {
        item.category = category;
        item.categoryStatus = 'Confirmed';
        await item.save();
        description = `Expense: ${item.billFrom}`;
        amount = -item.totalPay;
      }
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Log the audit
    const log = new AuditLog({
      action: 'CATEGORIZE_TRANSACTION',
      details: `Categorized ${type} transaction "${description}" (Amount: ${amount}) as "${category}".`,
      meta: { id, type, category }
    });
    await log.save();

    res.json({
      success: true,
      message: 'Category confirmed successfully',
      data: item
    });
  } catch (error) {
    console.error('Error confirming category:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
