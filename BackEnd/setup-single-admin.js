import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import { USER_ROLES } from './config/constants.js';
import logger from './utils/logger.js';

/**
 * Single Admin Setup Script
 * Removes all existing admins and creates only one admin user
 */

const setupSingleAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    console.log('\n🔧 Setting up single admin account...\n');

    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: USER_ROLES.ADMIN });

    if (existingAdmin) {
      console.log(`ℹ️  Admin account already exists: ${existingAdmin.email} (id: ${existingAdmin._id})`);
      console.log('No changes made. Use manage-admin or run a force script to replace existing admins.');
      process.exit(0);
    }

    // Create the admin user since none exists. Allow overriding via environment variables.
    const adminUser = new User({
      name: process.env.DEFAULT_ADMIN_NAME || 'Muhammad Zubair',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      role: USER_ROLES.ADMIN,
      phone: process.env.DEFAULT_ADMIN_PHONE || '+1234567890',
      department: process.env.DEFAULT_ADMIN_DEPARTMENT || 'Administration',
    });

    await adminUser.save();

    console.log('\n✅ Single admin account created successfully!\n');
    console.log('👤 Name: Muhammad Zubair');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('📱 Phone: +1234567890');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    console.log('ℹ️  Only ONE admin account exists in the system now.\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error setting up admin:', error);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the setup
setupSingleAdmin();
