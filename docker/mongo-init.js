// MongoDB Initialization Script for SwiftPay

db = db.getSiblingDB('swiftpay');

// Create collections
db.createCollection('transactions');
db.createCollection('users');
db.createCollection('audit_logs');

// Create indexes for transactions collection
db.transactions.createIndex({ transactionId: 1 }, { unique: true });
db.transactions.createIndex({ userId: 1, createdAt: -1 });
db.transactions.createIndex({ status: 1, createdAt: -1 });
db.transactions.createIndex({ createdAt: -1 });

// Create indexes for users collection
db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

// Create indexes for audit_logs collection
db.audit_logs.createIndex({ transactionId: 1 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ timestamp: -1 });

// Insert sample users with initial balances
db.users.insertMany([
  {
    userId: 'user_001',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    balance: 10000.00,
    currency: 'USD',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: 'user_002',
    email: 'bob@example.com',
    name: 'Bob Smith',
    balance: 5000.00,
    currency: 'USD',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: 'user_003',
    email: 'charlie@example.com',
    name: 'Charlie Brown',
    balance: 15000.00,
    currency: 'USD',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('SwiftPay database initialized successfully!');