const express = require('express');
const router = express.Router();
const WalletTransaction = require('../models/WalletTransaction');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/wallet
// @desc    Get all wallet transactions and current balance
router.get('/', protect, async (req, res) => {
  console.log('GET /api/wallet request received');
  try {
    const transactions = await WalletTransaction.find().sort({ date: -1 });
    console.log('Found transactions:', transactions.length);
    
    // Calculate total balance
    const totalCredit = transactions
      .filter(t => t.type === 'credit')
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const totalDebit = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const balance = totalCredit - totalDebit;

    res.json({ transactions, balance, totalCredit, totalDebit });
  } catch (err) {
    console.error('Wallet GET Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/wallet
// @desc    Add a new transaction
router.post('/', protect, async (req, res) => {
  const { description, amount, type, date } = req.body;
  try {
    const transaction = new WalletTransaction({
      description,
      amount: Number(amount),
      type,
      date: date || Date.now()
    });
    const createdTransaction = await transaction.save();
    res.status(201).json(createdTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/wallet/:id
// @desc    Remove a transaction
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await WalletTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
