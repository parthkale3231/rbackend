const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  riceType: { type: String, required: true, unique: true },
  totalStock: { type: Number, default: 0 }, // Total produced/added stock
  soldQuantity: { type: Number, default: 0 }, // Total sold
  remainingStock: { type: Number, default: 0 },
}, { timestamps: true });

// Middleware to calculate remaining stock
stockSchema.pre('save', async function() {
  this.remainingStock = this.totalStock - this.soldQuantity;
});

module.exports = mongoose.model('Stock', stockSchema);
