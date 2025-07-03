const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  createAdmin();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Import the User model
const User = require('../models/User');

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      displayName: 'Admin User'
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('\n⚠️ Please change this password after your first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}
