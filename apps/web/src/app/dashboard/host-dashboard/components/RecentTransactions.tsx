'use client';

import type { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  const isIncoming = (type: string) => type.includes('booking') || type.includes('payout');

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  isIncoming(tx.type)
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}
              >
                {isIncoming(tx.type) ? (
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
                isIncoming(tx.type)
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {isIncoming(tx.type) ? '+' : '-'}{tx.amount} USDC
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
