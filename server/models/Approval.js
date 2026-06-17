const mongoose = require('mongoose');

const ApprovalSchema = new mongoose.Schema({
  type: { type: String, enum: ['Match', 'Anomaly'], required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Alerted'], default: 'Pending' },
  reason: { type: String, default: '' },
  details: {
    // For matches
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentType: { type: String, enum: ['Invoice', 'Receipt', 'Expense'] },
    bankStatementEntryId: { type: mongoose.Schema.Types.ObjectId },
    confidenceScore: { type: Number },
    
    // For anomalies
    anomalyType: { type: String, enum: ['DuplicateInvoice', 'HighExpense'] },
    description: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Approval', ApprovalSchema);
