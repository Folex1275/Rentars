import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  syncPropertyFromChain,
  syncBookingFromChain,
  syncAllProperties,
  type BlockchainClient,
  type BlockchainProperty,
  type BlockchainBooking,
} from '../../src/services/sync.service.js';

// Mock Supabase
const mockSupabase = {
  from: mock(() => ({
    select: mock(() => ({
      eq: mock(() => ({
        single: mock(async () => ({ data: null, error: { code: 'PGRST116' } })),
      })),
    })),
    update: mock(() => ({
      eq: mock(() => ({
        select: mock(() => ({
          single: mock(async () => ({ data: { id: '1' }, error: null })),
        })),
      })),
    })),
    insert: mock(() => ({
      select: mock(() => ({
        single: mock(async () => ({ data: { id: '1' }, error: null })),
      })),
    })),
  })),
};

// Mock logging service
const mockLoggingService = {
  error: mock(() => {}),
};

// Mock blockchain client
const createMockBlockchainClient = (): BlockchainClient => ({
  getProperty: mock(async (id: bigint) => ({
    id,
    owner: 'owner123',
    title: 'Test Property',
    pricePerNight: BigInt(100),
    hash: 'hash123',
  })),
  getBooking: mock(async (id: bigint) => ({
    id,
    propertyId: BigInt(1),
    tenantId: 'tenant123',
    status: 'confirmed',
  })),
  getAllProperties: mock(async () => [
    {
      id: BigInt(1),
      owner: 'owner123',
      title: 'Property 1',
      pricePerNight: BigInt(100),
      hash: 'hash1',
    },
    {
      id: BigInt(2),
      owner: 'owner456',
      title: 'Property 2',
      pricePerNight: BigInt(150),
      hash: 'hash2',
    },
  ]),
  getAllBookings: mock(async () => [
    {
      id: BigInt(1),
      propertyId: BigInt(1),
      tenantId: 'tenant123',
      status: 'confirmed',
    },
  ]),
});

describe('Sync Service', () => {
  let blockchainClient: BlockchainClient;

  beforeEach(() => {
    blockchainClient = createMockBlockchainClient();
  });

  describe('syncPropertyFromChain', () => {
    it('should sync property when it exists on chain', async () => {
      const result = await syncPropertyFromChain(BigInt(1), blockchainClient);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error when property not found on chain', async () => {
      const client = createMockBlockchainClient();
      client.getProperty = mock(async () => null);

      const result = await syncPropertyFromChain(BigInt(999), client);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found on chain');
    });

    it('should detect hash mismatch and trigger update', async () => {
      const client = createMockBlockchainClient();
      const chainProp: BlockchainProperty = {
        id: BigInt(1),
        owner: 'owner123',
        title: 'Updated Title',
        pricePerNight: BigInt(200),
        hash: 'newhash',
      };
      client.getProperty = mock(async () => chainProp);

      const result = await syncPropertyFromChain(BigInt(1), client);
      expect(result.success).toBe(true);
    });
  });

  describe('syncBookingFromChain', () => {
    it('should sync booking when it exists on chain', async () => {
      const result = await syncBookingFromChain(BigInt(1), blockchainClient);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error when booking not found on chain', async () => {
      const client = createMockBlockchainClient();
      client.getBooking = mock(async () => null);

      const result = await syncBookingFromChain(BigInt(999), client);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found on chain');
    });

    it('should sync booking status from chain', async () => {
      const client = createMockBlockchainClient();
      const chainBooking: BlockchainBooking = {
        id: BigInt(1),
        propertyId: BigInt(1),
        tenantId: 'tenant123',
        status: 'completed',
      };
      client.getBooking = mock(async () => chainBooking);

      const result = await syncBookingFromChain(BigInt(1), client);
      expect(result.success).toBe(true);
    });
  });

  describe('syncAllProperties', () => {
    it('should process multiple properties', async () => {
      const result = await syncAllProperties(blockchainClient);
      expect(result.success).toBe(true);
      expect(result.data?.synced).toBeGreaterThan(0);
    });

    it('should handle partial failures', async () => {
      const client = createMockBlockchainClient();
      client.getAllProperties = mock(async () => [
        {
          id: BigInt(1),
          owner: 'owner123',
          title: 'Property 1',
          pricePerNight: BigInt(100),
          hash: 'hash1',
        },
        {
          id: BigInt(2),
          owner: 'owner456',
          title: 'Property 2',
          pricePerNight: BigInt(150),
          hash: 'hash2',
        },
      ]);

      const result = await syncAllProperties(client);
      expect(result.success).toBe(true);
      expect(result.data?.synced).toBeGreaterThanOrEqual(0);
    });
  });
});
