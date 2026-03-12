const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({ 
        username: adminUsername, 
        password: adminPassword, 
        role: 'admin' 
      });
      console.log(`✅ Admin user "${adminUsername}" created.`);
    } else {
      console.log('⚡ Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
