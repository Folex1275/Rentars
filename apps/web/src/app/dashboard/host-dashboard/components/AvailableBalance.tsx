'use client';

import { Wallet } from 'lucide-react';

interface AvailableBalanceProps {
  amount: number;
  onWithdraw?: () => void;
}

export default function AvailableBalance({
  amount,
  onWithdraw,
}: AvailableBalanceProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Available Balance</h3>
        <Wallet size={24} />
      </div>

      <p className="text-4xl font-bold mb-4">{amount} USDC</p>

      <button
        onClick={onWithdraw}
        className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition"
      >
        Withdraw Funds
      </button>
    </div>
  );
}
