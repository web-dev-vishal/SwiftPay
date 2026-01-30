const crypto = require('crypto');

/**
 * Generate a unique transaction ID
 * @returns {string}
 */
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `TXN_${timestamp}_${randomPart}`.toUpperCase();
};

/**
 * Sleep/delay utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>}
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Format currency amount
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Sanitize object for logging (remove sensitive data)
 * @param {Object} obj
 * @returns {Object}
 */
const sanitizeForLogging = (obj) => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  const sanitized = { ...obj };

  Object.keys(sanitized).forEach((key) => {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Calculate processing duration
 * @param {Date} startTime
 * @returns {number} Duration in milliseconds
 */
const calculateDuration = (startTime) => {
  return Date.now() - startTime.getTime();
};

/**
 * Validate currency code
 * @param {string} currency
 * @returns {boolean}
 */
const isValidCurrency = (currency) => {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'INR'];
  return validCurrencies.includes(currency);
};

/**
 * Round amount to 2 decimal places
 * @param {number} amount
 * @returns {number}
 */
const roundAmount = (amount) => {
  return Math.round(amount * 100) / 100;
};

/**
 * Check if value is a valid positive number
 * @param {any} value
 * @returns {boolean}
 */
const isPositiveNumber = (value) => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

module.exports = {
  generateTransactionId,
  sleep,
  retryWithBackoff,
  formatCurrency,
  sanitizeForLogging,
  calculateDuration,
  isValidCurrency,
  roundAmount,
  isPositiveNumber,
};