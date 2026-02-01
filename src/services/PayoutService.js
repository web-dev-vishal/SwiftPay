const Transaction = require('../models/Transaction');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { generateTransactionId, roundAmount } = require('../utils/helpers');

class PayoutService {
  constructor(redisBalanceService, distributedLock, messagePublisher, websocketServer) {
    this.redisBalanceService = redisBalanceService;
    this.distributedLock = distributedLock;
    this.messagePublisher = messagePublisher;
    this.websocketServer = websocketServer;
  }

  async initiatePayout(payoutData, metadata = {}) {
    const { userId, amount, currency } = payoutData;
    const transactionId = generateTransactionId();
    const roundedAmount = roundAmount(amount);

    let lockValue = null;

    try {
      logger.info('Attempting to acquire lock', { userId, transactionId });
      
      lockValue = await this.distributedLock.acquireWithRetry(
        userId,
        parseInt(process.env.LOCK_TTL_MS) || 30000,
        3,
        100
      );

      if (!lockValue) {
        throw new Error('CONCURRENT_REQUEST_DETECTED');
      }

      await AuditLog.logAction(transactionId, userId, 'LOCK_ACQUIRED', {
        lockValue,
        ttl: process.env.LOCK_TTL_MS,
      });

      const user = await User.findByUserId(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      if (user.status !== 'active') {
        throw new Error('USER_NOT_ACTIVE');
      }

      let balance = await this.redisBalanceService.getBalance(userId);
      
      if (balance === null) {
        await this.redisBalanceService.syncBalance(userId, user.balance);
        balance = user.balance;
      }

      const hasSufficient = await this.redisBalanceService.hasSufficientBalance(
        userId,
        roundedAmount
      );

      if (!hasSufficient) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const transaction = await Transaction.create({
        transactionId,
        userId,
        amount: roundedAmount,
        currency,
        status: 'initiated',
        type: 'payout',
        balanceBefore: balance,
        balanceAfter: balance - roundedAmount,
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          source: metadata.source || 'api',
          description: payoutData.description,
        },
        processingDetails: {
          initiatedAt: new Date(),
        },
        lockInfo: {
          lockAcquired: true,
        },
      });

      await AuditLog.logAction(transactionId, userId, 'PAYOUT_INITIATED', {
        amount: roundedAmount,
        currency,
        balance,
      });

      const messagePayload = {
        transactionId,
        userId,
        amount: roundedAmount,
        currency,
        metadata: {
          source: metadata.source || 'api',
          description: payoutData.description,
        },
      };

      const published = await this.messagePublisher.publishPayoutMessage(messagePayload);

      if (!published) {
        throw new Error('FAILED_TO_PUBLISH_MESSAGE');
      }

      await AuditLog.logAction(transactionId, userId, 'MESSAGE_PUBLISHED', {
        queue: 'payout_queue',
      });

      this.websocketServer.emitPayoutInitiated(userId, {
        transactionId,
        amount: roundedAmount,
        currency,
        status: 'initiated',
        timestamp: new Date().toISOString(),
      });

      logger.info('Payout initiated successfully', {
        transactionId,
        userId,
        amount: roundedAmount,
      });

      return {
        success: true,
        transactionId,
        status: 'initiated',
        amount: roundedAmount,
        currency,
        message: 'Payout request initiated successfully',
      };

    } catch (error) {
      logger.error('Failed to initiate payout', {
        userId,
        transactionId,
        error: error.message,
      });

      if (lockValue) {
        await this.distributedLock.release(userId, lockValue);
        await AuditLog.logAction(transactionId, userId, 'LOCK_RELEASED', {
          reason: 'error',
        });
      }

      const errorMap = {
        CONCURRENT_REQUEST_DETECTED: {
          code: 'CONCURRENT_REQUEST',
          message: 'Another payout request is being processed. Please wait.',
          statusCode: 409,
        },
        USER_NOT_FOUND: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          statusCode: 404,
        },
        USER_NOT_ACTIVE: {
          code: 'USER_NOT_ACTIVE',
          message: 'User account is not active',
          statusCode: 403,
        },
        INSUFFICIENT_BALANCE: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this payout',
          statusCode: 400,
        },
        FAILED_TO_PUBLISH_MESSAGE: {
          code: 'QUEUE_ERROR',
          message: 'Failed to queue payout request',
          statusCode: 503,
        },
      };

      const errorInfo = errorMap[error.message] || {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while processing your request',
        statusCode: 500,
      };

      throw {
        ...errorInfo,
        originalError: error.message,
      };
    }
  }

  async getTransactionStatus(transactionId) {
    try {
      const transaction = await Transaction.findByTransactionId(transactionId);

      if (!transaction) {
        throw new Error('TRANSACTION_NOT_FOUND');
      }

      return {
        success: true,
        transaction: {
          transactionId: transaction.transactionId,
          userId: transaction.userId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt,
          processingDetails: transaction.processingDetails,
        },
      };

    } catch (error) {
      logger.error('Failed to get transaction status', {
        transactionId,
        error: error.message,
      });

      throw {
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
        statusCode: 404,
      };
    }
  }

  async getUserBalance(userId) {
    try {
      let balance = await this.redisBalanceService.getBalance(userId);

      if (balance === null) {
        const user = await User.findByUserId(userId);
        if (!user) {
          throw new Error('USER_NOT_FOUND');
        }
        balance = user.balance;
        await this.redisBalanceService.syncBalance(userId, balance);
      }

      return {
        success: true,
        userId,
        balance,
        currency: 'USD',
      };

    } catch (error) {
      logger.error('Failed to get user balance', {
        userId,
        error: error.message,
      });

      throw {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        statusCode: 404,
      };
    }
  }
}

module.exports = PayoutService;