require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes Registration
app.use('/api/upload', require('./routes/upload'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/categorize', require('./routes/categorize'));
app.use('/api/audit-logs', require('./routes/audit'));
app.use('/api/alerts', require('./routes/alerts'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
