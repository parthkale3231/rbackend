const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/sales
// @desc    Get all sales
router.get('/', protect, async (req, res) => {
  try {
    const sales = await Sale.find().populate('customerId', 'name mobile').sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/sales
// @desc    Add a new sale
router.post('/', protect, async (req, res) => {
  const { customerId, riceType, quantity, rate, paymentStatus, date } = req.body;
  try {
    const totalAmount = quantity * rate;
    const saleDate = date ? new Date(date) : Date.now();
    
    // Check if stock exists and is sufficient
    const stock = await Stock.findOne({ riceType });
    if (!stock || stock.remainingStock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock or invalid rice type' });
    }

    const sale = new Sale({
      customerId,
      riceType,
      quantity,
      rate,
      totalAmount,
      paymentStatus,
      date: saleDate,
    });
    
    const createdSale = await sale.save();

    // Update stock
    stock.soldQuantity += quantity;
    await stock.save();

    // Update customer last transaction details
    await Customer.findByIdAndUpdate(customerId, {
      lastRiceType: riceType,
      lastQuantity: quantity,
      lastRate: rate,
      lastTotal: totalAmount,
      paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
    });

    res.status(201).json(createdSale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Delete a sale
router.delete('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // 1. Revert Stock
    const stock = await Stock.findOne({ riceType: sale.riceType });
    if (stock) {
      stock.soldQuantity -= sale.quantity;
      if (stock.soldQuantity < 0) stock.soldQuantity = 0;
      await stock.save();
    }

    // 2. Adjust Customer and find new latest sale
    const customer = await Customer.findById(sale.customerId);
    if (customer) {
        customer.totalBill -= sale.totalAmount;
        if (customer.totalBill < 0) customer.totalBill = 0;
        
        customer.remainingAmount = customer.totalBill - customer.paidAmount;
        if (customer.remainingAmount < 0) customer.remainingAmount = 0;
        
        customer.paymentStatus = customer.remainingAmount <= 0 ? 'Paid' : 'Unpaid';

        // Find new latest sale after this one is gone
        const remainingSale = await Sale.findOne({ 
             customerId: customer._id, 
             _id: { $ne: sale._id } 
        }).sort({ date: -1 });

        if (remainingSale) {
            customer.lastRiceType = remainingSale.riceType;
            customer.lastQuantity = remainingSale.quantity;
            customer.lastRate = remainingSale.rate;
        } else {
            customer.lastRiceType = '';
            customer.lastQuantity = 0;
            customer.lastRate = 0;
        }

        await customer.save();
    }

    await sale.deleteOne();
    res.json({ message: 'Sale deleted and stock reverted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
