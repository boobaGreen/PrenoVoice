module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],  // Solo file che finiscono con .test.ts o .spec.ts
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers\\.ts$', '/__tests__/setup\\.ts$'],  // Escludi esplicitamente i file di supporto
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1'
  },
  verbose: true
};