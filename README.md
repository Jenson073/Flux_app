# 📊 Accounting Automation System

An enterprise-grade, modern glassmorphic web application for automated document parsing, smart transaction reconciliation, ledger categorisation, and compliance auditing. Built using **React (Vite)**, **Node.js/Express**, and **MongoDB**.

---

# 🚀 Key Functionalities & Features

## 📤 1. Unified Upload & Parsing Dashboard

* Ingests financial documents in `.pdf` and `.xlsx` formats via visual drop zones.
* **Extraction Utilities:**

  * Extracts structured metadata (billers, dates, amounts, terms) on the fly.
  * Enforces the **Single Statement Overwrite Rule**: Uploading a new bank statement automatically clears the previous statement's records, preserving a single active ledger.

---

## 📑 2. Transaction Manager & Document Store

* Consolidated tables listing all active **Invoices**, **Receipts**, and **Expenses**.
* **Inline Editing & Cascading Updates:**

  * Accountant edits are committed immediately.
  * Modifying invoice totals or receipt amounts dynamically updates payment statuses and recalculates linked balances (capped at a minimum value of `0`).
* **Document Downloading:**

  * Original uploaded assets are stored on disk (`server/uploads/`) and are fully downloadable from the UI.

---

## 🤖 3. Smart Reconciliations (Weighted Matching Engine)

Matches receipts and expenses to bank statement records using a weighted scoring model:

* **Amount Match — 45%**
* **Date Proximity — 35%**
* **Payment Terms — 20%**

### 🔍 Strict Cashflow Validation

* Receipts are strictly filtered to match **Deposit/Credit** bank transactions (`deposits > 0`).
* Expenses are strictly filtered to match **Withdrawal/Debit** bank transactions (`withdrawals > 0`).
* Invalid pairs are discarded **before** score calculation.

### ✅ Approval Queue

* Suggestions with a confidence score of **≥ 60%** are automatically queued for auditor approval.
* Supports bulk reconciliation through the **"Pass All to Approval"** action.

---

## 🛡️ 4. Accountant Approval Board & Alerts Feed

A dedicated workspace for reviewing and approving matched transaction suggestions.

### Verification Controls

#### ✅ No Risk

* Approves the pairing and reconciles the entries.

#### 🚨 Alert!

* Escalates suspicious ledger items (such as duplicates or significant variances) to the Alerts Feed.

### ⏰ Proximity Alerts

* Highlights invoices due within **15 days or less** that remain unpaid or partially paid.

---

## 🗂️ 5. Unified Ledger Categorisation Grid

* Displays a unified grid containing **Invoices**, **Receipts**, and **Expenses** (excluding bank statement transactions).
* Search by description.
* Filter by:

  * Category Status (**Suggested**, **Confirmed**)
  * Category Type
  * Document Type

### ✏️ Accountant Overrides

* Categories can be changed inline.
* Confirmations are saved instantly.

---

## 📜 6. Chronological Audit Logs

Maintains a permanent compliance trail documenting:

* Document uploads
* Data overrides
* Matching approvals
* Reconciliation activities
* System-generated actions

---

# 🛠️ Tech Stack & Dependencies

## 💻 Frontend (Client)

* **Framework:** React 18+ (Vite SPA)
* **Icons:** `lucide-react`
* **Styling:** Modern CSS3 with a professional dark-blue glassmorphic theme (`backdrop-filter: blur(16px)`)

---

## ⚙️ Backend (Server)

* **Runtime Environment:** Node.js & Express
* **Database:** MongoDB (Object Modeling via Mongoose)

### 📄 Document Parsers

* `pdf-parse` — Custom asynchronous PDF extraction logic
* `xlsx` — Spreadsheet parser
* `multer` — Multipart form-data handling

---

# 📦 How to Extract & Run the Project

## ✅ Prerequisites

* Ensure **Node.js** (v16+) is installed on your machine.
* Ensure a running MongoDB instance or a valid MongoDB Atlas connection string.

---

## 📥 1. Installation

Navigate to the root directory of the extracted project and install both frontend and backend dependencies:

```bash
npm run install-all
```

Alternatively, install them manually:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
cd ..
```

---

## 🔧 2. Environment Configuration

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
```

---

## 🌱 3. Database Seeding (Optional)

Populate the database with sample invoices, receipts, expenses, and a sample bank statement for testing:

```bash
npm run seed --prefix server
```

---

## ▶️ 4. Running the Project Locally

Start both the React client and Express backend simultaneously in development mode:

```bash
npm run dev
```

### 🌐 Application URLs

* **React Client:** `http://localhost:5173`
* **Express Backend:** `http://localhost:5000`

---

# 📂 Project Directory Structure

```text
├── client/                   # React Frontend Application
│   ├── src/
│   │   ├── components/       # UI Section Panels
│   │   ├── utils/            # Client API Connection Modules
│   │   ├── App.jsx           # Main Navigation Router
│   │   ├── App.css           # Glassmorphic Theme Stylesheet
│   │   └── main.jsx
│   └── package.json
│
├── server/                   # Node.js/Express Backend Application
│   ├── config/               # Database Connection Configuration
│   ├── models/               # Mongoose Schemas (Invoice, Receipt, etc.)
│   ├── routes/               # API Endpoints (Alerts, Upload, Matches)
│   ├── uploads/              # Local Storage for Uploaded Documents
│   ├── utils/                # PDF & Excel Extraction Parsers and Seeders
│   ├── server.js             # Server Bootstrapper
│   └── package.json
│
├── package.json              # Workspace & Concurrently Scripts
└── README.md
```

---

# ✨ Enterprise Features Included

* 📄 Automated Document Parsing
* 🤖 Smart Weighted Reconciliation Engine
* 🛡️ Approval Workflow & Alerts Management
* 🗂️ Dynamic Ledger Categorisation
* 📜 Compliance Audit Trail
* 📥 Downloadable Source Documents
* 🏦 Single Active Bank Statement Management
* 🎨 Modern Glassmorphic Enterprise UI
* 🍃 MongoDB Persistence Layer
* ⚡ Real-Time Ledger Updates & Cascading Calculations

---

## 🎯 Designed For

* Accountants
* Auditors
* Finance Teams
* Small & Medium Businesses
* Enterprise Financial Operations

The Accounting Automation System streamlines document processing, transaction reconciliation, financial categorisation, compliance tracking, and audit readiness through a modern, efficient, and scalable workflow.
