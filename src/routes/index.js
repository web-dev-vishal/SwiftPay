const express = require('express');
const createPayoutRouter = require('./payout.routes');
const createHealthRouter = require('./health.routes');

const createRouter = (dependencies) => {
  const { payoutController, userRateLimiter, healthDependencies } = dependencies;

  const router = express.Router();

  router.use('/health', createHealthRouter(healthDependencies));

  router.use('/payout', createPayoutRouter(payoutController, userRateLimiter));

  router.get('/', (req, res) => {
    res.json({
      success: true,
      service: 'SwiftPay API Gateway',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        payout: '/api/payout',
        transaction: '/api/payout/:transactionId',
        balance: '/api/payout/user/:userId/balance',
        history: '/api/payout/user/:userId/history',
      },
      documentation: 'https://github.com/swiftpay/docs',
    });
  });

  return router;
};

module.exports = createRouter;