const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  billFrom: { type: String, required: true },
  invoiceNo: { type: String, required: true },
  dueDate: { type: Date, required: true },
  description: { type: String, required: true },
  totalDue: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Matched', 'Approved', 'Rejected'], default: 'Pending' },
  category: { type: String, default: '' },
  categoryStatus: { type: String, enum: ['Suggested', 'Confirmed'], default: 'Suggested' },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
