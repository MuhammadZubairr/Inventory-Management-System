import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Product from './models/Product.js';
import Supplier from './models/Supplier.js';
import Transaction from './models/Transaction.js';
import Warehouse from './models/Warehouse.js';

/**
 * Clear DB Script
 * Deletes all data from every collection EXCEPT admin users.
 * Run with: node clear-db.js
 */

const clearDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all non-admin users
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`🗑️  Users deleted       : ${deletedUsers.deletedCount}`);

    // Delete all products
    const deletedProducts = await Product.deleteMany({});
    console.log(`🗑️  Products deleted    : ${deletedProducts.deletedCount}`);

    // Delete all suppliers
    const deletedSuppliers = await Supplier.deleteMany({});
    console.log(`🗑️  Suppliers deleted   : ${deletedSuppliers.deletedCount}`);

    // Delete all warehouses
    const deletedWarehouses = await Warehouse.deleteMany({});
    console.log(`🗑️  Warehouses deleted  : ${deletedWarehouses.deletedCount}`);

    // Delete all transactions
    const deletedTransactions = await Transaction.deleteMany({});
    console.log(`🗑️  Transactions deleted: ${deletedTransactions.deletedCount}`);

    // Confirm admins kept
    const admins = await User.find({ role: 'admin' }).select('name email');
    console.log('\n✅ Admin accounts preserved:');
    admins.forEach((a) => console.log(`   - ${a.name} <${a.email}>`));

    console.log('\n✅ Database cleared. Ready for real data.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDB();
