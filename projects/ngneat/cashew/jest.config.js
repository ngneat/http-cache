module.exports = {
  bail: true,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/projects/ngneat/cashew/tsconfig.spec.json'
    }
  },
  cacheDirectory: '<rootDir>/.cache',
  testMatch: ['<rootDir>/projects/ngneat/cashew/src/**/*.spec.ts'],
  collectCoverage: true,
  modulePathIgnorePatterns: ['/mocks/']
};
