const mongoose = require('mongoose');
const WalletTransaction = require('./models/WalletTransaction');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ricemill');
  console.log('Connected to DB');
  const count = await WalletTransaction.countDocuments();
  console.log('Wallet count:', count);
  process.exit();
}
check();
