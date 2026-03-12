const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Customer = require('../models/Customer');
const Stock = require('../models/Stock');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const FarmerTransaction = require('../models/FarmerTransaction');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/reports/dashboard
// @desc    Get dashboard summary statistics
router.get('/dashboard', protect, async (req, res) => {
  try {
    const totalFarmers = await Farmer.countDocuments();
    const totalCustomers = await Customer.countDocuments();

    const stocks = await Stock.find();
    const totalStockAvailable = stocks.reduce((acc, curr) => acc + curr.remainingStock, 0);

    // Today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.find({ date: { $gte: today, $lt: tomorrow } });
    const todaySalesTotal = todaySales.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const todayExpenses = await Expense.find({ date: { $gte: today, $lt: tomorrow } });
    const todayExpensesTotal = todayExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    const todayPurchases = await FarmerTransaction.find({ date: { $gte: today, $lt: tomorrow } });
    const todayPurchasesTotal = todayPurchases.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const todayProfit = todaySalesTotal - todayExpensesTotal - todayPurchasesTotal;

    res.json({
      totalFarmers,
      totalCustomers,
      totalStockAvailable,
      todaySalesTotal,
      todayProfit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/reports/purchases
// @desc    Get all farmer transactions
router.get('/purchases', protect, async (req, res) => {
  try {
    const purchases = await FarmerTransaction.find().populate('farmerId', 'name village').sort({ date: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
