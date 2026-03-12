const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Route imports
const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmers');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const stockRoutes = require('./routes/stock');
const expensesRoutes = require('./routes/expenses');
const reportsRoutes = require('./routes/reports');
const walletRoutes = require('./routes/wallet');
const seedAdmin = require('./seed');

const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ricemill')
  .then(async () => {
    console.log('MongoDB Connected');
    await seedAdmin(); // Auto-seed admin on every startup
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
  res.send('Rice Mill API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
