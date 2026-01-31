const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR'],
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'suspended', 'closed'],
      default: 'active',
    },
    metadata: {
      lastPayoutAt: Date,
      totalPayouts: { type: Number, default: 0 },
      totalPayoutAmount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });

// Static method to find by userId
userSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

// Method to check sufficient balance
userSchema.methods.hasSufficientBalance = function (amount) {
  return this.balance >= amount;
};

module.exports = mongoose.model('User', userSchema);