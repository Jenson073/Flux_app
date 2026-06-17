const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Expense = require('../models/Expense');
const BankStatement = require('../models/BankStatement');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');

/**
 * Helper to calculate confidence score
 */
const calculateMatchScore = (doc, docType, bankEntry) => {
  const docAmount = doc.totalPay; // both use totalPay
  const docDate = docType === 'Expense' ? doc.payDate : doc.paymentDate;
  const docTerms = docType === 'Expense' ? doc.payTerms : 'UPI'; // Receipts default to UPI or match Invoice if needed
  
  // Under the strict direction filter:
  // Expense matches withdrawals; Receipt matches deposits
  const bankAmount = docType === 'Expense' ? bankEntry.withdrawals : bankEntry.deposits;
  const bankDate = bankEntry.date;
  const bankTerms = bankEntry.paymentTerm;

  // 1. Amount Score (Max 45%)
  // Amount diff: if diff is 0, score is 45. If diff is 50, score is 40.5 (approx 40).
  const amtDiff = Math.abs(docAmount - bankAmount);
  const amtScore = Math.max(0, 45 * (1 - amtDiff / 500));

  // 2. Date Score (Max 35%)
  // Date diff in days: same date = 35. 1 day diff = 31.5. >= 10 days diff = 0.
  const timeDiff = Math.abs(docDate.getTime() - bankDate.getTime());
  const diffDays = timeDiff / (1000 * 60 * 60 * 24);
  const dateScore = Math.max(0, 35 * (1 - diffDays / 10));

  // 3. Payment Terms Score (Max 20%)
  // Compare terms case-insensitively
  let termsScore = 0;
  if (docTerms && bankTerms) {
    const dTerm = docTerms.toLowerCase().trim();
    const bTerm = bankTerms.toLowerCase().trim();
    if (dTerm === bTerm) {
      termsScore = 20;
    } else if (dTerm.includes(bTerm) || bTerm.includes(dTerm)) {
      termsScore = 10;
    }
  } else {
    // If not specified, neutral 10
    termsScore = 10;
  }

  const totalScore = amtScore + dateScore + termsScore;

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    breakdown: {
      amount: Math.round(amtScore * 10) / 10,
      date: Math.round(dateScore * 10) / 10,
      terms: termsScore
    }
  };
};

/**
 * GET /api/matches
 * Calculate and return all possible matches (>60% confidence) that have not been approved/rejected.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Fetch pending receipts and expenses
    const pendingReceipts = await Receipt.find({ status: 'Pending' });
    const pendingExpenses = await Expense.find({ status: 'Pending' });
    
    // 2. Fetch all bank statement entries
    const bankEntries = await BankStatement.find();
    
    // 3. Fetch existing approvals (Pending, Approved, Rejected) to exclude them
    const existingApprovals = await Approval.find({ type: 'Match' });
    const processedPairings = new Set();
    
    existingApprovals.forEach(app => {
      if (app.details.documentId && app.details.bankStatementEntryId) {
        processedPairings.add(`${app.details.documentId}_${app.details.bankStatementEntryId}`);
      }
    });

    const possibleMatches = [];

    const processDoc = (doc, docType) => {
      bankEntries.forEach(bankEntry => {
        // Strict direction filter check BEFORE any calculations/listing
        if (docType === 'Receipt' && bankEntry.deposits <= 0) {
          return;
        }
        if (docType === 'Expense' && bankEntry.withdrawals <= 0) {
          return;
        }

        const pairingKey = `${doc._id}_${bankEntry._id}`;
        
        // Skip if this pairing has been processed (pending, approved, or rejected)
        if (processedPairings.has(pairingKey)) {
          return;
        }

        // Calculate score
        const { totalScore, breakdown } = calculateMatchScore(doc, docType, bankEntry);
        
        if (totalScore >= 60) {
          possibleMatches.push({
            document: doc,
            documentType: docType,
            bankEntry,
            confidenceScore: totalScore,
            breakdown
          });
        }
      });
    };

    pendingExpenses.forEach(exp => processDoc(exp, 'Expense'));
    pendingReceipts.forEach(rec => processDoc(rec, 'Receipt'));

    // Sort by confidence score descending
    possibleMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    res.json({
      success: true,
      matches: possibleMatches
    });
  } catch (error) {
    console.error('Error calculating matches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matches/pass-to-approval
 * Send a suggested match to the approval queue.
 */
router.post('/pass-to-approval', async (req, res) => {
  try {
    const { documentId, documentType, bankStatementEntryId, confidenceScore } = req.body;

    if (!documentId || !documentType || !bankStatementEntryId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if approval already exists
    const existing = await Approval.findOne({
      type: 'Match',
      'details.documentId': documentId,
      'details.bankStatementEntryId': bankStatementEntryId
    });

    if (existing) {
      return res.status(400).json({ error: 'Match already exists in the approval queue or is processed' });
    }

    // Get document and bank entry details for logging
    let docName = '';
    let docAmount = 0;
    if (documentType === 'Expense') {
      const exp = await Expense.findById(documentId);
      if (exp) {
        docName = exp.billFrom;
        docAmount = exp.totalPay;
      }
    } else {
      const rec = await Receipt.findById(documentId);
      if (rec) {
        docName = rec.billFrom;
        docAmount = rec.totalPay;
      }
    }

    const bankEntry = await BankStatement.findById(bankStatementEntryId);

    const approval = new Approval({
      type: 'Match',
      status: 'Pending',
      details: {
        documentId,
        documentType,
        bankStatementEntryId,
        confidenceScore
      }
    });

    await approval.save();

    // Create audit log
    const log = new AuditLog({
      action: 'PASS_MATCH_TO_APPROVAL',
      details: `Passed match for ${documentType} (${docName}, Amount: ${docAmount}) and Bank Entry (${bankEntry?.particulars || 'Unknown'}) with confidence score ${confidenceScore}% to Approval queue.`,
      meta: { approvalId: approval._id, documentId, bankStatementEntryId, confidenceScore }
    });
    await log.save();

    res.json({
      success: true,
      message: 'Match passed to approval queue successfully',
      data: approval
    });
  } catch (error) {
    console.error('Error passing match to approval:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matches/pass-all
 * Pass all suggested matches (confidence >60%) to the approval queue.
 */
router.post('/pass-all', async (req, res) => {
  try {
    const pendingReceipts = await Receipt.find({ status: 'Pending' });
    const pendingExpenses = await Expense.find({ status: 'Pending' });
    const bankEntries = await BankStatement.find();
    
    const existingApprovals = await Approval.find({ type: 'Match' });
    const processedPairings = new Set();
    
    existingApprovals.forEach(app => {
      if (app.details.documentId && app.details.bankStatementEntryId) {
        processedPairings.add(`${app.details.documentId}_${app.details.bankStatementEntryId}`);
      }
    });

    const passedRecords = [];

    const processDocBatch = async (doc, docType) => {
      for (const bankEntry of bankEntries) {
        // Strict direction filter check BEFORE any calculations/listing
        if (docType === 'Receipt' && bankEntry.deposits <= 0) {
          continue;
        }
        if (docType === 'Expense' && bankEntry.withdrawals <= 0) {
          continue;
        }

        const pairingKey = `${doc._id}_${bankEntry._id}`;
        
        if (processedPairings.has(pairingKey)) continue;

        const { totalScore } = calculateMatchScore(doc, docType, bankEntry);
        
        if (totalScore >= 60) {
          const approval = new Approval({
            type: 'Match',
            status: 'Pending',
            details: {
              documentId: doc._id,
              documentType: docType,
              bankStatementEntryId: bankEntry._id,
              confidenceScore: totalScore
            }
          });
          await approval.save();
          passedRecords.push(approval);
          processedPairings.add(pairingKey);
        }
      }
    };

    for (const exp of pendingExpenses) {
      await processDocBatch(exp, 'Expense');
    }
    for (const rec of pendingReceipts) {
      await processDocBatch(rec, 'Receipt');
    }

    if (passedRecords.length > 0) {
      const log = new AuditLog({
        action: 'PASS_ALL_MATCHES_TO_APPROVAL',
        details: `Passed all ${passedRecords.length} suggested match(es) to Approval queue in bulk.`,
        meta: { count: passedRecords.length }
      });
      await log.save();
    }

    res.json({
      success: true,
      count: passedRecords.length,
      message: `Bulk passed ${passedRecords.length} matches to approval queue.`
    });
  } catch (error) {
    console.error('Error passing all matches to approval:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

