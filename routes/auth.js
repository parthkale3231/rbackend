const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/login
// @desc    Auth user & get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/register (For initial setup we might need this, or create a seed script)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  const userExists = await User.findOne({ username });
  if (userExists) return res.status(400).json({ message: 'User already exists' });
  
  const user = await User.create({ username, password });
  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretricemill', {
    expiresIn: '30d',
  });
};

module.exports = router;
