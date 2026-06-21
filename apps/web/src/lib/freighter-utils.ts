import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: 'testnet' | 'mainnet';
  isLoading: boolean;
  error: string | null;
}

export class FreighterError extends Error {
  constructor(
    message: string,
    public code: 'NOT_INSTALLED' | 'NOT_CONNECTED' | 'SIGN_FAILED' | 'USER_REJECTED' | 'NETWORK_ERROR' = 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'FreighterError';
  }
}

/**
 * Check if Freighter wallet is installed and connected
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch (error) {
    return false;
  }
}

/**
 * Get the currently connected Freighter wallet public key/address
 */
export async function getFreighterPublicKey(): Promise<string> {
  try {
    const result = await getAddress();
    if (result.error) {
      if (result.error.message?.includes('Not connected')) {
        throw new FreighterError('Wallet not connected. Please open Freighter and connect.', 'NOT_CONNECTED');
      }
      throw new FreighterError(
        result.error.message || 'Failed to get wallet address',
        'NETWORK_ERROR'
      );
    }
    if (!result.address) {
      throw new FreighterError('No address returned from wallet', 'NOT_CONNECTED');
    }
    return result.address;
  } catch (error) {
    if (error instanceof FreighterError) throw error;
    throw new FreighterError(
      error instanceof Error ? error.message : 'Failed to get wallet address',
      'NETWORK_ERROR'
    );
  }
}

/**
 * Sign a transaction with Freighter wallet
 */
export async function signWithFreighter(xdr: string, network: 'testnet' | 'mainnet'): Promise<string> {
  try {
    const networkPassphrase = getNetworkPassphrase(network);
    const result = await signTransaction(xdr, {
      networkPassphrase,
    });

    if (result.error) {
      if (result.error.message?.includes('rejected')) {
        throw new FreighterError('Transaction signing rejected by user', 'USER_REJECTED');
      }
      throw new FreighterError(
        result.error.message || 'Failed to sign transaction',
        'SIGN_FAILED'
      );
    }

    if (!result.signedTxXdr) {
      throw new FreighterError('No signed transaction returned', 'SIGN_FAILED');
    }

    return result.signedTxXdr;
  } catch (error) {
    if (error instanceof FreighterError) throw error;
    throw new FreighterError(
      error instanceof Error ? error.message : 'Transaction signing failed',
      'SIGN_FAILED'
    );
  }
}

/**
 * Get network passphrase for transaction signing
 */
export function getNetworkPassphrase(network: 'testnet' | 'mainnet'): string {
  const passphrases = {
    testnet: 'Test SDF Network ; September 2015',
    mainnet: 'Public Global Stellar Network ; September 2015',
  };
  return passphrases[network];
}

/**
 * Verify if an address is a valid Stellar public key
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar public keys start with 'G' and are base32 encoded (56 chars)
  return /^G[A-Z2-7]{55}$/.test(address);
}

/**
 * Connect to Freighter wallet
 * @throws FreighterError if wallet is not installed or connection fails
 */
export async function connectFreighterWallet(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new FreighterError(
      'Freighter wallet is not installed. Please install it from https://www.freighter.app',
      'NOT_INSTALLED'
    );
  }

  const address = await getFreighterPublicKey();
  if (!isValidStellarAddress(address)) {
    throw new FreighterError('Invalid wallet address format', 'NETWORK_ERROR');
  }

  return address;
}

/**
 * Get wallet status without throwing
 */
export async function getWalletStatus(): Promise<WalletState> {
  try {
    const installed = await isFreighterInstalled();
    if (!installed) {
      return {
        isConnected: false,
        address: null,
        network: 'testnet',
        isLoading: false,
        error: 'Freighter wallet not installed',
      };
    }

    const address = await getFreighterPublicKey();
    return {
      isConnected: true,
      address,
      network: 'testnet',
      isLoading: false,
      error: null,
    };
  } catch (error) {
    return {
      isConnected: false,
      address: null,
      network: 'testnet',
      isLoading: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
