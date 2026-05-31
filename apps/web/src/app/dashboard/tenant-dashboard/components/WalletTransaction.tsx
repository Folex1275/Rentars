'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface WalletTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  date: Date;
  description: string;
  txHash?: string;
}

interface WalletTransactionProps {
  transactions: WalletTransaction[];
}

export default function WalletTransaction({
  transactions,
}: WalletTransactionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">USDC Transactions</h3>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  tx.type === 'received'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}
              >
                {tx.type === 'received' ? (
                  <ArrowDownLeft className="text-green-600" size={18} />
                ) : (
                  <ArrowUpRight className="text-red-600" size={18} />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{tx.description}</p>
                <p className="text-sm text-gray-500">
                  {tx.date.toLocaleDateString()}
                </p>
              </div>
            </div>
            <p
              className={`font-semibold ${
                tx.type === 'received'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {tx.type === 'received' ? '+' : '-'}{tx.amount} USDC
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
