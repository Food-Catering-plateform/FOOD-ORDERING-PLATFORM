module.exports = {
  testEnvironment: 'jsdom',        // Change to 'node' if it's not a React app
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'json', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '__tests__'
  ],
};