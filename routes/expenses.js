const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/expenses
// @desc    Get all expenses
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense
router.post('/', protect, async (req, res) => {
  const { description, amount, date } = req.body;
  try {
    const expenseDate = date ? new Date(date) : Date.now();
    const expense = new Expense({ description, amount, date: expenseDate });
    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await expense.deleteOne();
    res.json({ message: 'Expense removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
