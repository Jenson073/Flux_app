const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/audit-logs
 * Fetch all audit logs in reverse chronological order.
 */
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 });
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
