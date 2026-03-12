const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  village: { type: String },
  paddyWeight: { type: Number, default: 0 }, // in Quintals
  ratePerQuintal: { type: Number, default: 0 }, // Rs per Quintal
    totalCost: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentHistory: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }],
}, { timestamps: true });

module.exports = mongoose.model('Farmer', farmerSchema);
