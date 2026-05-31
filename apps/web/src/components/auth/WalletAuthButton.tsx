'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, LogOut } from 'lucide-react';
import { FreighterFallback } from './FreighterFallback';

interface WalletAuthButtonProps {
  network?: 'testnet' | 'mainnet';
}

export function WalletAuthButton({ network = 'testnet' }: WalletAuthButtonProps) {
  const { connect, disconnect, isConnected, publicKey, isLoading, error } = useWallet(network);
  const [showFallback, setShowFallback] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      setShowFallback(true);
    }
  };

  if (showFallback) {
    return <FreighterFallback />;
  }

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-mono">
          {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Disconnect wallet"
        >
          <LogOut size={18} className="text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
    >
      <Wallet size={18} />
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
