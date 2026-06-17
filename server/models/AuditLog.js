const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  details: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.Mixed } // Arbitrary object for extra context
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
