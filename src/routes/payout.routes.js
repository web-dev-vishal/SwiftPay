const express = require('express');
const { validate } = require('../middleware/validation');
const { payoutRequestSchema } = require('../validators/payout.validator');

const createPayoutRouter = (payoutController, userRateLimiter) => {
  const router = express.Router();

  router.post(
    '/',
    userRateLimiter,
    validate(payoutRequestSchema),
    payoutController.createPayout
  );

  router.get(
    '/:transactionId',
    payoutController.getTransactionStatus
  );

  router.get(
    '/user/:userId/balance',
    payoutController.getUserBalance
  );

  router.get(
    '/user/:userId/history',
    payoutController.getTransactionHistory
  );

  return router;
};

module.exports = createPayoutRouter;