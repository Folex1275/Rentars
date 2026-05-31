'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

export default function WalletConnectionModal({
  isOpen,
  onClose,
  onConnect,
}: WalletConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleFreighterConnect = async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const publicKey = await (window as any).freighter.getPublicKey();
        onConnect(publicKey);
        onClose();
      } else {
        alert('Freighter wallet not found. Please install it.');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm">
            Connect your Stellar wallet to complete this booking. Your USDC will be held in escrow until the rental is confirmed.
          </p>

          <button
            onClick={handleFreighterConnect}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {isConnecting ? 'Connecting...' : 'Connect Freighter Wallet'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Don't have Freighter?{' '}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Install it here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
