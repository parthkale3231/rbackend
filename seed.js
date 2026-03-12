const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const userExists = await User.findOne({ username: 'admin' });
    if (!userExists) {
      await User.create({ username: 'parth123', password: 'parth@1321', role: 'admin' });
      console.log('✅ Admin user "admin" created with password "password123".');
    } else {
      console.log('⚡ Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
