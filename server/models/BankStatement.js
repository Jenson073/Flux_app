const mongoose = require('mongoose');

const BankStatementSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  particulars: { type: String }, // Stores transaction details like "UPI/sam"
  paymentTerm: { type: String, default: '' }, // e.g. "UPI"
  withdrawals: { type: Number, default: 0 },
  deposits: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  category: { type: String, default: '' },
  categoryStatus: { type: String, enum: ['Suggested', 'Confirmed'], default: 'Suggested' },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String }
});

module.exports = mongoose.model('BankStatement', BankStatementSchema);
