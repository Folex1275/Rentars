import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '../useWallet';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock('@/lib/freighter-utils', () => ({
  isFreighterInstalled: vi.fn(),
  getFreighterPublicKey: vi.fn(),
  signWithFreighter: vi.fn(),
}));

vi.mock('@/lib/network-utils', () => ({
  getNetworkPassphrase: vi.fn((network) => {
    return network === 'testnet'
      ? 'Test SDF Network ; September 2015'
      : 'Public Global Stellar Network ; September 2015';
  }),
}));

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isConnected is false initially', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(false);
  });

  it('publicKey is null initially', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.publicKey).toBe(null);
  });

  it('connect() calls Freighter API and sets publicKey', async () => {
    const { isFreighterInstalled, getFreighterPublicKey } = await import(
      '@/lib/freighter-utils'
    );

    vi.mocked(isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(getFreighterPublicKey).mockResolvedValue('GTEST123456789');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe('GTEST123456789');
  });

  it('disconnect() clears state', async () => {
    const { isFreighterInstalled, getFreighterPublicKey } = await import(
      '@/lib/freighter-utils'
    );

    vi.mocked(isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(getFreighterPublicKey).mockResolvedValue('GTEST123456789');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('signTransaction() returns signed XDR', async () => {
    const { isFreighterInstalled, getFreighterPublicKey, signWithFreighter } =
      await import('@/lib/freighter-utils');

    vi.mocked(isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(getFreighterPublicKey).mockResolvedValue('GTEST123456789');
    vi.mocked(signWithFreighter).mockResolvedValue('signed-xdr-123');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    let signedXdr: string;
    await act(async () => {
      signedXdr = await result.current.signTransaction('unsigned-xdr');
    });

    expect(signedXdr!).toBe('signed-xdr-123');
  });

  it('handles Freighter not installed error', async () => {
    const { isFreighterInstalled } = await import('@/lib/freighter-utils');

    vi.mocked(isFreighterInstalled).mockResolvedValue(false);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('Freighter wallet is not installed');
  });

  it('handles user rejection error', async () => {
    const { isFreighterInstalled, getFreighterPublicKey } = await import(
      '@/lib/freighter-utils'
    );

    vi.mocked(isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(getFreighterPublicKey).mockRejectedValue(
      new Error('User rejected the request')
    );

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('User rejected the request');
  });

  it('detects network mismatch', async () => {
    const { isFreighterInstalled, getFreighterPublicKey, signWithFreighter } =
      await import('@/lib/freighter-utils');

    vi.mocked(isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(getFreighterPublicKey).mockResolvedValue('GTEST123456789');
    vi.mocked(signWithFreighter).mockRejectedValue(
      new Error('Network mismatch: user on mainnet but app expects testnet')
    );

    const { result } = renderHook(() => useWallet('testnet'));

    await act(async () => {
      await result.current.connect();
    });

    let error: string | null = null;
    await act(async () => {
      try {
        await result.current.signTransaction('unsigned-xdr');
      } catch (err) {
        error = (err as Error).message;
      }
    });

    expect(error).toContain('Network mismatch');
  });

  it('isLoading is true during connect', async () => {
    const { isFreighterInstalled, getFreighterPublicKey } = await import(
      '@/lib/freighter-utils'
    );

    vi.mocked(isFreighterInstalled).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(true), 100);
        })
    );
    vi.mocked(getFreighterPublicKey).mockResolvedValue('GTEST123456789');

    const { result } = renderHook(() => useWallet());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.connect();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns correct network', () => {
    const { result: testnetResult } = renderHook(() => useWallet('testnet'));
    expect(testnetResult.current.network).toBe('testnet');

    const { result: mainnetResult } = renderHook(() => useWallet('mainnet'));
    expect(mainnetResult.current.network).toBe('mainnet');
  });

  it('signTransaction throws error when not connected', async () => {
    const { result } = renderHook(() => useWallet());

    let error: Error | null = null;
    await act(async () => {
      try {
        await result.current.signTransaction('unsigned-xdr');
      } catch (err) {
        error = err as Error;
      }
    });

    expect(error?.message).toBe('Wallet not connected');
  });
});
