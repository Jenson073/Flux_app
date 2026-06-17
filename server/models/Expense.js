const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  billFrom: { type: String, required: true },
  payDate: { type: Date, required: true },
  payTerms: { type: String, required: true },
  description: { type: String, required: true },
  totalPay: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Matched', 'Approved', 'Rejected'], default: 'Pending' },
  category: { type: String, default: '' },
  categoryStatus: { type: String, enum: ['Suggested', 'Confirmed'], default: 'Suggested' },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
