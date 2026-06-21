'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { connectFreighterWallet, FreighterError, isValidStellarAddress } from '@/lib/freighter-utils';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

type ConnectionStatus = 'idle' | 'connecting' | 'success' | 'error';

export default function WalletConnectionModal({
  isOpen,
  onClose,
  onConnect,
}: WalletConnectionModalProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    if (isOpen) {
      const savedAddress = localStorage.getItem('walletAddress');
      if (savedAddress && isValidStellarAddress(savedAddress)) {
        setConnectedAddress(savedAddress);
        setStatus('success');
      }
    }
  }, [isOpen]);

  const handleFreighterConnect = async () => {
    setStatus('connecting');
    setError(null);

    try {
      const publicKey = await connectFreighterWallet();

      if (!isValidStellarAddress(publicKey)) {
        throw new FreighterError('Invalid wallet address format', 'NETWORK_ERROR');
      }

      // Save to localStorage
      localStorage.setItem('walletAddress', publicKey);
      setConnectedAddress(publicKey);
      setStatus('success');

      // Call callback and close after brief delay for UX
      setTimeout(() => {
        onConnect(publicKey);
        onClose();
      }, 500);
    } catch (err) {
      let errorMessage = 'Failed to connect wallet';

      if (err instanceof FreighterError) {
        switch (err.code) {
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
          case 'SIGN_FAILED':
            errorMessage = 'Failed to connect wallet. Please try again.';
            break;
          default:
            errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('walletAddress');
    setConnectedAddress(null);
    setStatus('idle');
    setError(null);
  };

  const handleClose = () => {
    if (status === 'connecting') return; // Prevent closing during connection
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {connectedAddress ? 'Wallet Connected' : 'Connect Your Wallet'}
          </h2>
          <button
            onClick={handleClose}
            disabled={status === 'connecting'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Messages */}
          {status === 'success' && connectedAddress && (
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-900">Wallet Connected</p>
                <p className="text-xs text-green-700 mt-1 break-all font-mono">{connectedAddress}</p>
              </div>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-900">Connection Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Main Description */}
          {!connectedAddress && status !== 'error' && (
            <p className="text-gray-600 text-sm">
              Connect your Stellar wallet to complete this booking. Your USDC will be held in escrow
              until the rental is confirmed.
            </p>
          )}

          {/* Connect Button */}
          {!connectedAddress && (
            <button
              onClick={handleFreighterConnect}
              disabled={status === 'connecting'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {status === 'connecting' && <Loader2 size={18} className="animate-spin" />}
              <span>{status === 'connecting' ? 'Connecting...' : 'Connect Freighter Wallet'}</span>
            </button>
          )}

          {/* Disconnect Button */}
          {connectedAddress && status === 'success' && (
            <button
              onClick={handleDisconnect}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg transition border border-red-200"
            >
              Disconnect Wallet
            </button>
          )}

          {/* Retry Button on Error */}
          {status === 'error' && (
            <button
              onClick={handleFreighterConnect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Try Again
            </button>
          )}

          {/* Info */}
          {!connectedAddress && (
            <p className="text-xs text-gray-500 text-center">
              Don't have Freighter?{' '}
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                Install it here
              </a>
            </p>
          )}

          {/* Network Info */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 text-center">
              Connected to <span className="font-medium text-gray-700">Stellar Testnet</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
