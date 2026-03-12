const mongoose = require('mongoose');

const farmerTransactionSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  paddyType: { type: String, required: true },
  weight: { type: Number, required: true }, // in kg
  rate: { type: Number, required: true }, // ₹ per kg
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FarmerTransaction', farmerTransactionSchema);
