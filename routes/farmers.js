const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const FarmerTransaction = require('../models/FarmerTransaction');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/farmers
// @desc    Get all farmers (supports search by name/mobile ?search=term)
router.get('/', protect, async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const farmers = await Farmer.find(query).sort({ createdAt: -1 });
    
    // Fix any records that have incorrect remaining balance (legacy support)
    const sanitizedFarmers = farmers.map(farmer => {
      const f = farmer.toObject();
      f.remainingAmount = (f.totalCost || 0) - (f.paidAmount || 0);
      return f;
    });
    
    res.json(sanitizedFarmers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/farmers
// @desc    Add a new farmer
router.post('/', protect, async (req, res) => {
  const { name, mobile, village, paddyWeight, ratePerQuintal, paidAmount } = req.body;
  
  const weight = Number(paddyWeight) || 0;
  const rate = Number(ratePerQuintal) || 0;
  const totalCost = weight * rate;
  const initialPaid = Number(paidAmount) || 0;
  const remainingAmount = totalCost - initialPaid;

  try {
    const paymentHistory = [];
    if (initialPaid > 0) {
      paymentHistory.push({ 
        amount: initialPaid, 
        date: Date.now(), 
        note: 'Initial payment at purchase' 
      });
    }

    const farmer = new Farmer({ 
      name, 
      mobile, 
      village, 
      paddyWeight: weight, 
      ratePerQuintal: rate, 
      totalCost,
      paidAmount: initialPaid,
      remainingAmount,
      paymentHistory
    });

    const createdFarmer = await farmer.save();
    res.status(201).json(createdFarmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /api/farmers/:id
// @desc    Update farmer details
router.put('/:id', protect, async (req, res) => {
  const { name, mobile, village, paddyWeight, ratePerQuintal } = req.body;
  const weight = Number(paddyWeight) || 0;
  const rate = Number(ratePerQuintal) || 0;
  const totalCost = weight * rate;

  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

    farmer.name = name || farmer.name;
    farmer.mobile = mobile || farmer.mobile;
    farmer.village = village !== undefined ? village : farmer.village;
    farmer.paddyWeight = weight;
    farmer.ratePerQuintal = rate;
    farmer.totalCost = totalCost;
    
    // Recalculate remaining balance based on updated total cost
    farmer.remainingAmount = totalCost - farmer.paidAmount;

    const updatedFarmer = await farmer.save();
    res.json(updatedFarmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   POST /api/farmers/:id/payments
// @desc    Add a payment to a farmer (History Trace)
router.post('/:id/payments', protect, async (req, res) => {
  const { amount, date, note } = req.body;
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const paymentDate = date ? new Date(date) : Date.now();
    
    // Update Farmer record
    farmer.paidAmount += payAmount;
    
    // Robust calculation: Total Cost - Total Paid
    farmer.remainingAmount = (farmer.totalCost || 0) - farmer.paidAmount;
    
    farmer.paymentHistory.push({
      amount: payAmount,
      date: paymentDate,
      note: note || 'Additional payment'
    });

    await farmer.save();
    res.json(farmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/farmers/:id
// @desc    Delete a farmer
router.delete('/:id', protect, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
    await farmer.deleteOne();
    res.json({ message: 'Farmer removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/farmers/:id
// @desc    Get farmer details and their transactions
router.get('/:id', protect, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    const transactions = await FarmerTransaction.find({ farmerId: req.params.id }).sort({ date: -1 });
    res.json({ farmer, transactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/farmers/:id/transactions
// @desc    Add a transaction for a farmer
router.post('/:id/transactions', protect, async (req, res) => {
  const { paddyType, weight, rate, date, paidAmount } = req.body;
  try {
    const totalAmount = weight * rate;
    const initialPaid = Number(paidAmount) || 0;
    const remainingAmount = totalAmount - initialPaid;
    const transactionDate = date ? new Date(date) : Date.now();
    
    const paymentHistory = [];
    if (initialPaid > 0) {
      paymentHistory.push({ amount: initialPaid, date: transactionDate });
    }

    const transaction = new FarmerTransaction({
      farmerId: req.params.id,
      paddyType,
      weight,
      rate,
      totalAmount,
      paidAmount: initialPaid,
      remainingAmount,
      paymentHistory,
      date: transactionDate,
    });
    
    const createdTransaction = await transaction.save();
    res.status(201).json(createdTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   POST /api/farmers/transactions/:txId/payments
// @desc    Add a payment to an existing transaction
router.post('/transactions/:txId/payments', protect, async (req, res) => {
  const { amount, date } = req.body;
  try {
    const transaction = await FarmerTransaction.findById(req.params.txId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    transaction.paidAmount += paymentAmount;
    transaction.remainingAmount -= paymentAmount;
    transaction.paymentHistory.push({
      amount: paymentAmount,
      date: date ? new Date(date) : Date.now()
    });

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/farmers/transactions/:txId
// @desc    Delete a farmer transaction
router.delete('/transactions/:txId', protect, async (req, res) => {
  try {
    const transaction = await FarmerTransaction.findById(req.params.txId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
