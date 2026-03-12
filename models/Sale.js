const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  riceType: { type: String, required: true },
  quantity: { type: Number, required: true }, // in kg
  rate: { type: Number, required: true }, // ₹ per kg
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
