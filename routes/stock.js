const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/stock
// @desc    Get all stock
router.get('/', protect, async (req, res) => {
  try {
    const stock = await Stock.find();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/stock
// @desc    Add new stock or update existing stock
router.post('/', protect, async (req, res) => {
  const { riceType, quantity } = req.body;
  try {
    let stock = await Stock.findOne({ riceType });
    if (stock) {
      stock.totalStock += quantity;
      const updatedStock = await stock.save();
      res.json(updatedStock);
    } else {
      stock = new Stock({ riceType, totalStock: quantity });
      const createdStock = await stock.save();
      res.status(201).json(createdStock);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /api/stock/:id
// @desc    Update stock details (admin adjustment)
router.put('/:id', protect, async (req, res) => {
  const { riceType, totalStock, soldQuantity } = req.body;
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    if (riceType !== undefined) stock.riceType = riceType;
    if (totalStock !== undefined) stock.totalStock = Number(totalStock);
    if (soldQuantity !== undefined) stock.soldQuantity = Number(soldQuantity);

    const updatedStock = await stock.save();
    res.json(updatedStock);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/stock/:id
// @desc    Delete a stock record
router.delete('/:id', protect, async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    await stock.deleteOne();
    res.json({ message: 'Stock record removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
