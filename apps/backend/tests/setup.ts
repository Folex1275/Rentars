/**
 * Global test setup — runs before all tests.
 * Initializes mock environment variables and mock clients.
 */

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.JWT_SECRET = 'mock-jwt-secret';
process.env.STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
process.env.STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.PORT = '3000';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
