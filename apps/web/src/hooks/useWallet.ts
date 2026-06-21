import { useState, useCallback, useEffect } from 'react';
import {
  connectFreighterWallet,
  getWalletStatus,
  isValidStellarAddress,
  FreighterError,
  WalletState,
} from '@/lib/freighter-utils';

export interface UseWalletReturn {
  state: WalletState & { isLoading: boolean };
  connect: () => Promise<void>;
  disconnect: () => void;
  checkStatus: () => Promise<void>;
}

/**
 * Hook for managing Freighter wallet connection and status
 */
export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState & { isLoading: boolean }>({
    isConnected: false,
    address: null,
    network: 'testnet',
    isLoading: true,
    error: null,
  });

  // Check for existing connection on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const status = await getWalletStatus();
    setState((prev) => ({
      ...status,
      isLoading: false,
    }));
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const address = await connectFreighterWallet();
      localStorage.setItem('walletAddress', address);

      setState({
        isConnected: true,
        address,
        network: 'testnet',
        isLoading: false,
        error: null,
      });
    } catch (error) {
      let errorMessage = 'Failed to connect wallet';

      if (error instanceof FreighterError) {
        switch (error.code) {
          case 'NOT_INSTALLED':
            errorMessage =
              'Freighter wallet is not installed. Please install it from https://www.freighter.app';
            break;
          case 'NOT_CONNECTED':
            errorMessage =
              'Wallet is not connected in Freighter. Please open Freighter and connect your account.';
            break;
          case 'USER_REJECTED':
            errorMessage = 'You rejected the connection request. Please try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('walletAddress');
    setState({
      isConnected: false,
      address: null,
      network: 'testnet',
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    state,
    connect,
    disconnect,
    checkStatus,
  };
}
