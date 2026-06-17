const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  billFrom: { type: String, required: true },
  paymentDate: { type: Date, required: true },
  totalPay: { type: Number, required: true },
  remaining: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Matched', 'Approved', 'Rejected', 'Partial Pay'], default: 'Pending' },
  category: { type: String, default: '' },
  categoryStatus: { type: String, enum: ['Suggested', 'Confirmed'], default: 'Suggested' },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
