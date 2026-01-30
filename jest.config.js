module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/**/index.js',
      '!**/node_modules/**',
    ],
    testMatch: [
      '**/tests/**/*.test.js',
    ],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
  };