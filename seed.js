const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ricemill');
    
    const userExists = await User.findOne({ username: 'admin' });
    if (!userExists) {
      await User.create({ username: 'admin', password: 'password123', role: 'admin' });
      console.log('✅ Admin user "admin" created with password "password123".');
    } else {
      console.log('⚡ Admin user already exists. Checking password format is covered.');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedAdmin();
