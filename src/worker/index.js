require('dotenv').config();

const database = require('../config/database');
const redisConnection = require('../config/redis');
const rabbitmq = require('../config/rabbitmq');

const DistributedLock = require('../services/DistributedLock');
const RedisBalanceService = require('../services/RedisBalanceService');
const MessageConsumer = require('../services/MessageConsumer');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const logger = require('../utils/logger');
const { calculateDuration } = require('../utils/helpers');

class WorkerService {
  constructor() {
    this.redis = null;
    this.rabbitmqChannel = null;
    this.balanceService = null;
    this.distributedLock = null;
    this.consumer = null;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      logger.info('Starting SwiftPay Worker Service...');

      logger.info('Connecting to MongoDB...');
      await database.connect();

      logger.info('Connecting to Redis...');
      await redisConnection.connect();
      this.redis = redisConnection.getClient();

      logger.info('Connecting to RabbitMQ...');
      await rabbitmq.connect();
      this.rabbitmqChannel = rabbitmq.getChannel();

      this.balanceService = new RedisBalanceService(this.redis);
      this.distributedLock = new DistributedLock(this.redis);

      logger.info('SwiftPay Worker Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Worker Service:', error);
      throw error;
    }
  }

  async processPayoutMessage(payload, msg) {
    const startTime = new Date();
    const { transactionId, userId, amount, currency } = payload;

    let transaction = null;

    try {
      logger.info('Processing payout message', {
        transactionId,
        userId,
        amount,
      });

      transaction = await Transaction.findByTransactionId(transactionId);

      if (!transaction) {
        throw new Error('TRANSACTION_NOT_FOUND');
      }

      if (transaction.status === 'completed') {
        logger.warn('Transaction already completed (idempotent)', {
          transactionId,
        });
        return;
      }

      if (transaction.status === 'processing') {
        logger.warn('Transaction already being processed', {
          transactionId,
        });
        throw new Error('ALREADY_PROCESSING');
      }

      await transaction.markAsProcessing();

      await AuditLog.logAction(transactionId, userId, 'PAYOUT_PROCESSING', {
        status: 'processing',
      });

      await this.emitWebSocketEvent(userId, 'PAYOUT_PROCESSING', {
        transactionId,
        amount,
        currency,
      });

      const currentBalance = await this.balanceService.getBalance(userId);

      if (currentBalance === null) {
        throw new Error('BALANCE_NOT_FOUND');
      }

      if (currentBalance < amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      logger.debug('Balance validation passed', {
        transactionId,
        currentBalance,
        amount,
      });

      const newBalance = await this.balanceService.deductBalance(userId, amount);

      await AuditLog.logAction(transactionId, userId, 'BALANCE_DEDUCTED', {
        previousBalance: currentBalance,
        newBalance,
        amount,
      });

      logger.info('Balance deducted successfully', {
        transactionId,
        previousBalance: currentBalance,
        newBalance,
      });

      transaction.balanceAfter = newBalance;
      await transaction.markAsCompleted();

      await User.updateOne(
        { userId },
        {
          $set: { balance: newBalance },
          $inc: {
            'metadata.totalPayouts': 1,
            'metadata.totalPayoutAmount': amount,
          },
          $currentDate: { 'metadata.lastPayoutAt': true },
        }
      );

      try {
        await this.redis.del(`lock:${userId}`);
        
        await AuditLog.logAction(transactionId, userId, 'LOCK_RELEASED', {
          success: true,
        });
      } catch (lockError) {
        logger.warn('Failed to release lock', {
          transactionId,
          error: lockError.message,
        });
      }

      await this.emitWebSocketEvent(userId, 'PAYOUT_COMPLETED', {
        transactionId,
        amount,
        currency,
        newBalance,
      });

      await AuditLog.logAction(transactionId, userId, 'PAYOUT_COMPLETED', {
        amount,
        newBalance,
        processingTimeMs: calculateDuration(startTime),
      });

      logger.info('Payout processed successfully', {
        transactionId,
        userId,
        amount,
        processingTimeMs: calculateDuration(startTime),
      });

    } catch (error) {
      logger.error('Failed to process payout', {
        transactionId,
        userId,
        error: error.message,
        processingTimeMs: calculateDuration(startTime),
      });

      if (error.message !== 'TRANSACTION_NOT_FOUND' && 
          error.message !== 'ALREADY_PROCESSING' &&
          error.message !== 'INSUFFICIENT_BALANCE') {
        
        try {
          await this.balanceService.addBalance(userId, amount);
          
          await AuditLog.logAction(transactionId, userId, 'BALANCE_RESTORED', {
            amount,
            reason: 'error_rollback',
          });

          logger.info('Balance restored due to error', {
            transactionId,
            amount,
          });

        } catch (rollbackError) {
          logger.error('Failed to rollback balance', {
            transactionId,
            error: rollbackError.message,
          });
        }
      }

      if (transaction) {
        await transaction.markAsFailed(error);
      }

      await this.emitWebSocketEvent(userId, 'PAYOUT_FAILED', {
        transactionId,
        amount,
        currency,
        error: error.message,
      });

      await AuditLog.logAction(transactionId, userId, 'PAYOUT_FAILED', {
        error: error.message,
        processingTimeMs: calculateDuration(startTime),
      });

      throw error;
    }
  }

  async emitWebSocketEvent(userId, event, data) {
    try {
      const message = JSON.stringify({
        userId,
        event,
        data,
        timestamp: new Date().toISOString(),
      });

      await this.redis.publish('websocket:events', message);

      logger.debug('WebSocket event published to Redis', {
        userId,
        event,
      });

    } catch (error) {
      logger.error('Failed to publish WebSocket event', {
        userId,
        event,
        error: error.message,
      });
    }
  }

  async start() {
    try {
      this.consumer = new MessageConsumer(
        this.rabbitmqChannel,
        this.processPayoutMessage.bind(this)
      );

      await this.consumer.startConsuming('payout_queue');

      const concurrency = parseInt(process.env.WORKER_CONCURRENCY) || 5;
      logger.info(`Worker Service started successfully`, {
        concurrency,
        queue: 'payout_queue',
      });

    } catch (error) {
      logger.error('Failed to start Worker Service:', error);
      throw error;
    }
  }

  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down SwiftPay Worker Service...');

    try {
      if (this.consumer) {
        await this.consumer.stopConsuming();
      }

      logger.info('Waiting for in-flight messages to complete...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await rabbitmq.disconnect();

      await redisConnection.disconnect();

      await database.disconnect();

      logger.info('SwiftPay Worker Service shut down successfully');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const worker = new WorkerService();

(async () => {
  try {
    await worker.initialize();
    await worker.start();
  } catch (error) {
    logger.error('Failed to start Worker Service:', error);
    process.exit(1);
  }
})();

process.on('SIGTERM', () => worker.shutdown());
process.on('SIGINT', () => worker.shutdown());

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  worker.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  worker.shutdown();
});

module.exports = worker;