const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  lastRiceType: { type: String },
  lastQuantity: { type: Number, default: 0 },
  lastRate: { type: Number, default: 0 },
  totalBill: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  paymentHistory: [{
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      note: { type: String }
  }],
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid'], default: 'Paid' },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
