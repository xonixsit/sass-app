#!/usr/bin/env node

// Manual database initialization script
const { initDatabase } = require('./database');
const { initSubscriptionTables, createDefaultSubscriptions } = require('./subscription');

async function initializeDatabase() {
  try {
    console.log('🔄 Starting database initialization...');
    
    // Initialize main database tables
    console.log('📋 Creating main tables...');
    await initDatabase();
    
    // Initialize subscription tables
    console.log('💳 Creating subscription tables...');
    await initSubscriptionTables();
    
    // Create default subscriptions
    console.log('🎯 Creating default subscriptions...');
    await createDefaultSubscriptions();
    
    console.log('✅ Database initialization completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();