const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/customers
// @desc    Get all customers
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
    const customers = await Customer.find(query).sort({ createdAt: -1 });

    // Sanitize and ensure robust calculation (Total - Paid)
    const sanitizedCustomers = customers.map(c => {
        const cust = c.toObject();
        cust.totalBill = (cust.lastQuantity || 0) * (cust.lastRate || 0);
        cust.remainingAmount = cust.totalBill - (cust.paidAmount || 0);
        return cust;
    });

    res.json(sanitizedCustomers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/customers
// @desc    Add a new customer with optional immediate sale
router.post('/', protect, async (req, res) => {
  const { name, mobile, riceType, quantity, rate, paidAmount } = req.body;
  
  try {
    const lastQuantity = Number(quantity) || 0;
    const lastRate = Number(rate) || 0;
    const totalBill = lastQuantity * lastRate;
    const initialPaid = Number(paidAmount) || 0;
    
    // 1. Stock check
    let stock = null;
    if (riceType && lastQuantity > 0) {
      stock = await Stock.findOne({ riceType });
      if (!stock || stock.remainingStock < lastQuantity) {
        return res.status(400).json({ message: `Insufficient stock for ${riceType}. Available: ${stock ? stock.remainingStock : 0}kg` });
      }
    }

    // 2. Create History if initial paid
    const paymentHistory = [];
    if (initialPaid > 0) {
        paymentHistory.push({
            amount: initialPaid,
            date: Date.now(),
            note: 'Initial payment at sale'
        });
    }

    // 3. Create Customer
    const customer = new Customer({ 
      name, 
      mobile, 
      lastRiceType: riceType,
      lastQuantity,
      lastRate,
      totalBill,
      paidAmount: initialPaid,
      remainingAmount: totalBill - initialPaid,
      paymentHistory,
      paymentStatus: (totalBill - initialPaid) <= 0 ? 'Paid' : 'Unpaid'
    });
    const createdCustomer = await customer.save();

    // 4. Process the sale record
    if (stock && lastQuantity > 0) {
      const sale = new Sale({
        customerId: createdCustomer._id,
        riceType,
        quantity: lastQuantity,
        rate: lastRate,
        totalAmount: totalBill,
        paymentStatus: (totalBill - initialPaid) <= 0 ? 'Paid' : 'Pending',
        date: Date.now()
      });
      await sale.save();

      stock.soldQuantity += lastQuantity;
      await stock.save();
    }

    res.status(201).json(createdCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  const { name, mobile, riceType, quantity, rate } = req.body;
  
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const oldRiceType = customer.lastRiceType;
    const oldQuantity = customer.lastQuantity || 0;

    customer.name = name || customer.name;
    customer.mobile = mobile || customer.mobile;
    
    const newRiceType = riceType !== undefined ? riceType : customer.lastRiceType;
    const newQuantity = quantity !== undefined ? Number(quantity) : customer.lastQuantity;
    const newRate = rate !== undefined ? Number(rate) : customer.lastRate;

    // Stock Adjustment Logic
    if (newRiceType !== oldRiceType || newQuantity !== oldQuantity) {
        if (oldRiceType === newRiceType) {
            if (newRiceType) {
                const stock = await Stock.findOne({ riceType: newRiceType });
                if (stock) {
                    const diff = newQuantity - oldQuantity;
                    stock.soldQuantity += diff;
                    await stock.save();
                }
            }
        } else {
            if (oldRiceType) {
                const oldStock = await Stock.findOne({ riceType: oldRiceType });
                if (oldStock) { oldStock.soldQuantity -= oldQuantity; await oldStock.save(); }
            }
            if (newRiceType) {
                const newStock = await Stock.findOne({ riceType: newRiceType });
                if (newStock) { newStock.soldQuantity += newQuantity; await newStock.save(); }
            }
        }
    }

    customer.lastRiceType = newRiceType;
    customer.lastQuantity = newQuantity;
    customer.lastRate = newRate;
    customer.totalBill = newQuantity * newRate;
    customer.remainingAmount = customer.totalBill - customer.paidAmount;
    customer.paymentStatus = customer.remainingAmount <= 0 ? 'Paid' : 'Unpaid';

    const updatedCustomer = await customer.save();
    
    // Sync Sales
    const lastSale = await Sale.findOne({ customerId: updatedCustomer._id }).sort({ createdAt: -1 });
    if (lastSale) {
        lastSale.riceType = newRiceType;
        lastSale.quantity = newQuantity;
        lastSale.rate = newRate;
        lastSale.totalAmount = updatedCustomer.totalBill;
        lastSale.paymentStatus = updatedCustomer.remainingAmount <= 0 ? 'Paid' : 'Pending';
        await lastSale.save();
    }

    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   POST /api/customers/:id/payments
// @desc    Add installment payment for customer
router.post('/:id/payments', protect, async (req, res) => {
    const { amount, note } = req.body;
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        const payAmount = Number(amount);
        if (isNaN(payAmount) || payAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        customer.paidAmount += payAmount;
        // Robust calculation
        const weight = Number(customer.lastQuantity) || 0;
        const rate = Number(customer.lastRate) || 0;
        customer.totalBill = weight * rate;
        customer.remainingAmount = customer.totalBill - customer.paidAmount;
        customer.paymentStatus = customer.remainingAmount <= 0 ? 'Paid' : 'Unpaid';
        
        customer.paymentHistory.push({
            amount: payAmount,
            date: Date.now(),
            note: note || 'Installment Payment'
        });

        await customer.save();
        
        // Update last sale payment status to keep records in sync
        const lastSale = await Sale.findOne({ customerId: customer._id }).sort({ createdAt: -1 });
        if (lastSale) {
            lastSale.paymentStatus = customer.remainingAmount <= 0 ? 'Paid' : 'Pending';
            await lastSale.save();
        }

        res.json(customer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   DELETE /api/customers/:id
// @desc    Delete a customer
router.delete('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await customer.deleteOne();
    res.json({ message: 'Customer removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
