import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isFreighterInstalled,
  getFreighterPublicKey,
  signWithFreighter,
  getNetworkPassphrase,
  isValidStellarAddress,
  connectFreighterWallet,
  getWalletStatus,
  FreighterError,
} from '../freighter-utils';

// Mock the Freighter API
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}));

import * as FreighterApi from '@stellar/freighter-api';

describe('freighter-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isFreighterInstalled', () => {
    it('returns true when wallet is connected', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: true });

      const result = await isFreighterInstalled();

      expect(result).toBe(true);
    });

    it('returns false when wallet is not connected', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: false });

      const result = await isFreighterInstalled();

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      vi.mocked(FreighterApi.isConnected).mockRejectedValue(new Error('Network error'));

      const result = await isFreighterInstalled();

      expect(result).toBe(false);
    });
  });

  describe('getFreighterPublicKey', () => {
    const mockAddress = 'GTEST123456789012345678901234567890123456789012345678';

    it('returns public key on success', async () => {
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({ address: mockAddress });

      const result = await getFreighterPublicKey();

      expect(result).toBe(mockAddress);
    });

    it('throws FreighterError with NOT_CONNECTED code when not connected', async () => {
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({
        error: { message: 'Not connected' },
      } as any);

      await expect(getFreighterPublicKey()).rejects.toThrow(FreighterError);
      await expect(getFreighterPublicKey()).rejects.toThrow(/not connected/i);
    });

    it('throws FreighterError on API error', async () => {
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({
        error: { message: 'API Error' },
      } as any);

      await expect(getFreighterPublicKey()).rejects.toThrow(FreighterError);
    });

    it('throws FreighterError when no address returned', async () => {
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({ address: null } as any);

      await expect(getFreighterPublicKey()).rejects.toThrow(FreighterError);
    });
  });

  describe('signWithFreighter', () => {
    const mockXdr = 'test-xdr-string';
    const mockSignedXdr = 'signed-xdr-string';

    it('returns signed XDR on success', async () => {
      vi.mocked(FreighterApi.signTransaction).mockResolvedValue({ signedTxXdr: mockSignedXdr });

      const result = await signWithFreighter(mockXdr, 'testnet');

      expect(result).toBe(mockSignedXdr);
      expect(FreighterApi.signTransaction).toHaveBeenCalledWith(mockXdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
    });

    it('uses correct network passphrase for mainnet', async () => {
      vi.mocked(FreighterApi.signTransaction).mockResolvedValue({ signedTxXdr: mockSignedXdr });

      await signWithFreighter(mockXdr, 'mainnet');

      expect(FreighterApi.signTransaction).toHaveBeenCalledWith(mockXdr, {
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      });
    });

    it('throws FreighterError with USER_REJECTED when user rejects', async () => {
      vi.mocked(FreighterApi.signTransaction).mockResolvedValue({
        error: { message: 'User rejected the signing request' },
      } as any);

      await expect(signWithFreighter(mockXdr, 'testnet')).rejects.toThrow(FreighterError);
    });

    it('throws FreighterError when signing fails', async () => {
      vi.mocked(FreighterApi.signTransaction).mockResolvedValue({
        error: { message: 'Signing failed' },
      } as any);

      await expect(signWithFreighter(mockXdr, 'testnet')).rejects.toThrow(FreighterError);
    });

    it('throws FreighterError when no signed XDR returned', async () => {
      vi.mocked(FreighterApi.signTransaction).mockResolvedValue({ signedTxXdr: null } as any);

      await expect(signWithFreighter(mockXdr, 'testnet')).rejects.toThrow(FreighterError);
    });
  });

  describe('getNetworkPassphrase', () => {
    it('returns testnet passphrase', () => {
      const result = getNetworkPassphrase('testnet');
      expect(result).toBe('Test SDF Network ; September 2015');
    });

    it('returns mainnet passphrase', () => {
      const result = getNetworkPassphrase('mainnet');
      expect(result).toBe('Public Global Stellar Network ; September 2015');
    });
  });

  describe('isValidStellarAddress', () => {
    it('returns true for valid Stellar address', () => {
      const validAddress = 'GTEST123456789012345678901234567890123456789012345678';
      expect(isValidStellarAddress(validAddress)).toBe(true);
    });

    it('returns false for invalid address - too short', () => {
      expect(isValidStellarAddress('GTEST123')).toBe(false);
    });

    it('returns false for invalid address - wrong prefix', () => {
      const invalidAddress = 'ATEST123456789012345678901234567890123456789012345678';
      expect(isValidStellarAddress(invalidAddress)).toBe(false);
    });

    it('returns false for invalid address - contains invalid characters', () => {
      const invalidAddress = 'GTEST1234567890123456789012345678901234567890123456789!';
      expect(isValidStellarAddress(invalidAddress)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidStellarAddress('')).toBe(false);
    });
  });

  describe('connectFreighterWallet', () => {
    const mockAddress = 'GTEST123456789012345678901234567890123456789012345678';

    it('returns address on successful connection', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({ address: mockAddress });

      const result = await connectFreighterWallet();

      expect(result).toBe(mockAddress);
    });

    it('throws error when wallet not installed', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: false });

      await expect(connectFreighterWallet()).rejects.toThrow(/not installed/i);
    });

    it('throws error for invalid address', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({ address: 'INVALID' });

      await expect(connectFreighterWallet()).rejects.toThrow(/invalid wallet address format/i);
    });
  });

  describe('getWalletStatus', () => {
    const mockAddress = 'GTEST123456789012345678901234567890123456789012345678';

    it('returns connected status', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(FreighterApi.getAddress).mockResolvedValue({ address: mockAddress });

      const result = await getWalletStatus();

      expect(result).toEqual({
        isConnected: true,
        address: mockAddress,
        network: 'testnet',
        isLoading: false,
        error: null,
      });
    });

    it('returns disconnected status when wallet not installed', async () => {
      vi.mocked(FreighterApi.isConnected).mockResolvedValue({ isConnected: false });

      const result = await getWalletStatus();

      expect(result.isConnected).toBe(false);
      expect(result.address).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('returns error status on exception', async () => {
      vi.mocked(FreighterApi.isConnected).mockRejectedValue(new Error('Network error'));

      const result = await getWalletStatus();

      expect(result.isConnected).toBe(false);
      expect(result.address).toBeNull();
      expect(result.error).toContain('Network error');
    });
  });

  describe('FreighterError', () => {
    it('creates error with default code', () => {
      const error = new FreighterError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('FreighterError');
    });

    it('creates error with custom code', () => {
      const error = new FreighterError('Test error', 'NOT_INSTALLED');

      expect(error.code).toBe('NOT_INSTALLED');
    });
  });
});