import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '../useWallet';
import * as freighterUtils from '@/lib/freighter-utils';

// Mock the freighter utilities
vi.mock('@/lib/freighter-utils', () => ({
  connectFreighterWallet: vi.fn(),
  getWalletStatus: vi.fn(),
  isValidStellarAddress: vi.fn((addr) => /^G[A-Z2-7]{55}$/.test(addr)),
  FreighterError: class FreighterError extends Error {
    constructor(message: string, code: string = 'NETWORK_ERROR') {
      super(message);
      this.code = code;
    }
  },
}));

describe('useWallet', () => {
  const mockPublicKey = 'GTEST123456789012345678901234567890123456789012345678';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initialization', () => {
    it('initializes with loading state', () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useWallet());

      expect(result.current.state.isLoading).toBe(true);
    });

    it('checks wallet status on mount', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      renderHook(() => useWallet());

      await waitFor(() => {
        expect(freighterUtils.getWalletStatus).toHaveBeenCalled();
      });
    });

    it('loads connected wallet from status', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: true,
        address: mockPublicKey,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.state.isConnected).toBe(true);
        expect(result.current.state.address).toBe(mockPublicKey);
      });
    });
  });

  describe('connect', () => {
    it('connects wallet successfully', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.state.isConnected).toBe(true);
      expect(result.current.state.address).toBe(mockPublicKey);
      expect(result.current.state.error).toBeNull();
    });

    it('saves address to localStorage', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await result.current.connect();
      });

      expect(localStorage.getItem('walletAddress')).toBe(mockPublicKey);
    });

    it('handles NOT_INSTALLED error', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const error = new (freighterUtils as any).FreighterError(
        'Not installed',
        'NOT_INSTALLED'
      );
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toContain('not installed');
      expect(result.current.state.isConnected).toBe(false);
    });

    it('handles NOT_CONNECTED error', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const error = new (freighterUtils as any).FreighterError(
        'Not connected',
        'NOT_CONNECTED'
      );
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toContain('not connected');
    });

    it('handles USER_REJECTED error', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const error = new (freighterUtils as any).FreighterError('Rejected', 'USER_REJECTED');
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toContain('rejected');
    });

    it('sets loading state during connection', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      let resolveConnect: (value: string) => void;
      const connectPromise = new Promise<string>((resolve) => {
        resolveConnect = resolve;
      });

      vi.mocked(freighterUtils.connectFreighterWallet).mockReturnValue(connectPromise);

      const { result } = renderHook(() => useWallet());

      const connectPromiseResult = act(async () => {
        const promise = result.current.connect();
        expect(result.current.state.isLoading).toBe(true);
        resolveConnect!(mockPublicKey);
        await promise;
      });

      await connectPromiseResult;
    });
  });

  describe('disconnect', () => {
    it('disconnects wallet', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: true,
        address: mockPublicKey,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      localStorage.setItem('walletAddress', mockPublicKey);

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.state.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.state.isConnected).toBe(false);
      expect(result.current.state.address).toBeNull();
      expect(localStorage.getItem('walletAddress')).toBeNull();
    });
  });

  describe('checkStatus', () => {
    it('checks wallet status', async () => {
      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: true,
        address: mockPublicKey,
        network: 'testnet',
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.state.isConnected).toBe(true);
      });

      vi.mocked(freighterUtils.getWalletStatus).mockResolvedValue({
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: 'Wallet disconnected',
      });

      await act(async () => {
        await result.current.checkStatus();
      });

      expect(result.current.state.isConnected).toBe(false);
      expect(result.current.state.error).toBe('Wallet disconnected');
    });
  });
});