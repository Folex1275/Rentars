'use client';

import { useState, useCallback, useEffect } from 'react';
import { isFreighterInstalled, getFreighterPublicKey, signWithFreighter } from '@/lib/freighter-utils';
import { getNetworkPassphrase } from '@/lib/network-utils';

interface UseWalletReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  isConnected: boolean;
  publicKey: string | null;
  network: string;
  isLoading: boolean;
  error: string | null;
}

export function useWallet(network: 'testnet' | 'mainnet' = 'testnet'): UseWalletReturn {
  const [isConnectedState, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const installed = await isFreighterInstalled();
      if (!installed) {
        throw new Error('Freighter wallet is not installed');
      }
      const key = await getFreighterPublicKey();
      setPublicKey(key);
      setIsConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const signTx = useCallback(
    async (xdr: string): Promise<string> => {
      if (!isConnectedState) {
        throw new Error('Wallet not connected');
      }
      try {
        const networkPassphrase = getNetworkPassphrase(network);
        return await signWithFreighter(xdr, networkPassphrase);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign transaction';
        setError(message);
        throw err;
      }
    },
    [isConnectedState, network]
  );

  return {
    connect,
    disconnect,
    signTransaction: signTx,
    isConnected: isConnectedState,
    publicKey,
    network,
    isLoading,
    error,
  };
}
