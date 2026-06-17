require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Receipt = require('../models/Receipt');
const BankStatement = require('../models/BankStatement');
const Approval = require('../models/Approval');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://id:6973@cluster0.fdcnt.mongodb.net/?appName=Cluster0';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    // Clear existing collections
    console.log('Clearing old collections...');
    await Invoice.deleteMany({});
    await Expense.deleteMany({});
    await Receipt.deleteMany({});
    await BankStatement.deleteMany({});
    await Approval.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Cleared!');

    // 1. Seed Invoices
    console.log('Seeding invoices...');
    const inv1 = new Invoice({
      billFrom: 'Apex IT Solutions & Consulting Ltd.',
      invoiceNo: 'INV-2026-0089',
      dueDate: new Date('2026-07-10'),
      description: 'Custom Software Development (Sprint 3 & 4), API Gateway Integration & Security Setup, Cloud Database Migration Services',
      totalDue: 3450.00,
      fileName: 'invoice_INV-2026-0089.pdf',
      status: 'Pending'
    });
    
    // Seed a duplicate invoice to trigger duplicate anomaly detection
    const invDuplicate = new Invoice({
      billFrom: 'Apex IT Solutions & Consulting Ltd.',
      invoiceNo: 'INV-2026-0089', // Same invoice number
      dueDate: new Date('2026-07-15'),
      description: 'Duplicate Copy - Custom Software Development',
      totalDue: 3450.00,
      fileName: 'invoice_INV-2026-0089_copy.pdf',
      status: 'Pending'
    });

    await inv1.save();
    await invDuplicate.save();

    // 2. Seed Receipts
    console.log('Seeding receipts...');
    const rec1 = new Receipt({
      invoiceNo: 'INV-2026-0089',
      billFrom: 'Apex IT Solutions & Consulting Ltd.',
      paymentDate: new Date('2026-06-10'),
      totalPay: 3450.00,
      remaining: 0,
      fileName: 'receipt_INV-2026-0089.pdf',
      status: 'Pending'
    });
    await rec1.save();

    // 3. Seed Expenses
    console.log('Seeding expenses...');
    // Utilities expenses
    const exp1 = new Expense({
      billFrom: 'State Electricity Board',
      payDate: new Date('2026-05-14'),
      payTerms: 'UPI',
      description: 'Electricity bill juice',
      totalPay: 50.00,
      fileName: 'electricity_may_2026.pdf',
      status: 'Pending'
    });
    
    const exp2 = new Expense({
      billFrom: 'State Electricity Board',
      payDate: new Date('2026-06-06'),
      payTerms: 'UPI',
      description: 'Electricity bill juice',
      totalPay: 10.00,
      fileName: 'electricity_june_2026.pdf',
      status: 'Pending'
    });
    
    // Office Supplies expenses
    const exp3 = new Expense({
      billFrom: 'Nellai Xerox & Stationers',
      payDate: new Date('2026-05-18'),
      payTerms: 'UPI',
      description: 'Office Supply Purchase dress',
      totalPay: 5.00,
      fileName: 'xerox_bill.pdf',
      status: 'Pending'
    });

    // High expense to trigger category large expense anomaly (>1.5x average)
    const expHigh = new Expense({
      billFrom: 'Corporate Retreats & Caterers',
      payDate: new Date('2026-06-02'),
      payTerms: 'UPI',
      description: 'Office Supply Purchase treat',
      totalPay: 7000.00, // Very large expense compared to 5.00
      fileName: 'retreat_catering_invoice.pdf',
      status: 'Pending'
    });

    await exp1.save();
    await exp2.save();
    await exp3.save();
    await expHigh.save();

    // 4. Seed Bank Statement Entries (from Tamilnad Mercantile Bank statement)
    console.log('Seeding bank statement...');
    const bankEntries = [
      { date: '2026-05-13', particulars: 'UPI/215077377622/P JOHNY SAMDAS/SBIN/Payment from', paymentTerm: 'UPI', withdrawals: 0, deposits: 5000.00, balance: 6554.79 },
      { date: '2026-05-13', particulars: 'UPI/649937697760/GURUDEVAN J/IBKL/UPI', paymentTerm: 'UPI', withdrawals: 5000.00, deposits: 0, balance: 1554.79 },
      { date: '2026-05-14', particulars: 'UPI/613455564107/MUTHUKUMAR/IOBA/UPI', paymentTerm: 'UPI', withdrawals: 10.00, deposits: 0, balance: 1544.79 },
      { date: '2026-05-15', particulars: 'UPI/650183943556/8667048636@ptye/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 540.00, deposits: 0, balance: 1004.79 },
      { date: '2026-05-18', particulars: 'UPI/650497652784/NELLAI XEROX AN/IOBA/UPI', paymentTerm: 'UPI', withdrawals: 5.00, deposits: 0, balance: 999.79 },
      { date: '2026-05-19', particulars: 'UPI/613985955936/CHRISTY J/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 0, deposits: 201.00, balance: 1200.79 },
      { date: '2026-05-19', particulars: 'UPI/613989457868/LA ARABIAN/YESB/UPI', paymentTerm: 'UPI', withdrawals: 140.00, deposits: 0, balance: 1060.79 },
      { date: '2026-05-19', particulars: 'UPI/613992649322/R K FOOD TRUCK/IOBA/UPI', paymentTerm: 'UPI', withdrawals: 60.00, deposits: 0, balance: 1000.79 },
      { date: '2026-05-23', particulars: 'UPI/650936455868/LA ARABIAN/YESB/UPI', paymentTerm: 'UPI', withdrawals: 70.00, deposits: 0, balance: 930.79 },
      { date: '2026-05-25', particulars: 'UPI/614561367372/CHRISTY J/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 0, deposits: 70.00, balance: 1000.79 },
      { date: '2026-05-26', particulars: 'UPI/162338253926/Elakkiya S/SBIN/Payment from Pho', paymentTerm: 'UPI', withdrawals: 0, deposits: 20.00, balance: 1020.79 },
      { date: '2026-06-01', particulars: 'UPI/173919814378/P JOHNY SAMDAS/SBIN/Payment from', paymentTerm: 'UPI', withdrawals: 0, deposits: 1000.00, balance: 2020.79 },
      { date: '2026-06-01', particulars: 'UPI/651811778886/jensonjenson779/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 1.00, deposits: 0, balance: 2019.79 },
      { date: '2026-06-01', particulars: 'UPI/615276909708/jensonjenson779/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 500.00, deposits: 0, balance: 1519.79 },
      { date: '2026-06-02', particulars: 'UPI/209478779232/P JOHNY SAMDAS/SBIN/Payment from', paymentTerm: 'UPI', withdrawals: 0, deposits: 7000.00, balance: 8519.79 },
      { date: '2026-06-02', particulars: 'UPI/615375448651/MS SRI AMMAN RE/IDIB/UPI', paymentTerm: 'UPI', withdrawals: 7000.00, deposits: 0, balance: 1519.79 },
      { date: '2026-06-04', particulars: 'UPI/615579224481/C M DIGEESH/KKBK/UPI', paymentTerm: 'UPI', withdrawals: 170.00, deposits: 0, balance: 1349.79 },
      { date: '2026-06-06', particulars: 'UPI/652344225157/KANAGAJOTHI J/YESB/UPI', paymentTerm: 'UPI', withdrawals: 10.00, deposits: 0, balance: 1339.79 },
      { date: '2026-06-09', particulars: 'UPI/616064526354/J Jenson/SBIN/UPI', paymentTerm: 'UPI', withdrawals: 0, deposits: 300.00, balance: 1639.79 }
    ];

    for (const b of bankEntries) {
      const bs = new BankStatement({
        date: new Date(b.date),
        particulars: b.particulars,
        paymentTerm: b.paymentTerm,
        withdrawals: b.withdrawals,
        deposits: b.deposits,
        balance: b.balance,
        fileName: 'TMB_bank_statement_may_june_2026.pdf'
      });
      await bs.save();
    }

    // 5. Seed Audit Logs
    console.log('Seeding initial audit logs...');
    const auditLogs = [
      { action: 'SYSTEM_INITIALIZATION', details: 'Initialized accounting system database with seed records.', meta: { source: 'seed.js' } },
      { action: 'UPLOAD_INVOICES', details: 'Saved 2 invoice(s) to database (including duplicate check candidate).', meta: { count: 2 } },
      { action: 'UPLOAD_RECEIPTS', details: 'Saved 1 receipt(s) to database (reconciliation targets).', meta: { count: 1 } },
      { action: 'UPLOAD_EXPENSES', details: 'Saved 4 expense record(s) to database (including high expense threshold tests).', meta: { count: 4 } },
      { action: 'REPLACE_BANK_STATEMENT', details: 'Uploaded bank statement TMB_bank_statement_may_june_2026.pdf containing 19 entries.', meta: { fileName: 'TMB_bank_statement_may_june_2026.pdf', count: 19 } }
    ];

    for (const l of auditLogs) {
      const log = new AuditLog(l);
      await log.save();
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
