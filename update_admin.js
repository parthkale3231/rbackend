const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const updateAdmin = async (newUsername, newPassword) => {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ricemill';
    const sanitizedUri = dbUri.startsWith('mongodb+srv') ? dbUri.replace(/:\d+/, '') : dbUri;
    
    await mongoose.connect(sanitizedUri);
    console.log('Connected to MongoDB...');

    let admin = await User.findOne({ role: 'admin' });

    if (admin) {
      admin.username = newUsername || admin.username;
      if (newPassword) {
        admin.password = newPassword;
      }
      await admin.save();
      console.log(`✅ Admin updated: Username "${admin.username}"`);
    } else {
      await User.create({
        username: newUsername || 'admin',
        password: newPassword || 'password123',
        role: 'admin'
      });
      console.log(`✅ New Admin created: Username "${newUsername || 'admin'}"`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
};

// Usage: node update_admin.js <new_username> <new_password>
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

if (!username || !password) {
  console.log('Usage: node update_admin.js <new_username> <new_password>');
  console.log('Example: node update_admin.js myadmin mysecurepassword');
  process.exit(1);
}

updateAdmin(username, password);
