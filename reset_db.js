const mongoose = require('mongoose');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ricemill';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for Reset...');

    const collections = mongoose.connection.collections;

    for (const key in collections) {
      if (key === 'users') {
          console.log(`Skipping collection: ${key} (Keeping users)`);
          continue;
      }
      await collections[key].deleteMany({});
      console.log(`Cleared collection: ${key}`);
    }

    console.log('\nSUCCESS: Database has been reset (except for Users).');
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
};

resetDatabase();
