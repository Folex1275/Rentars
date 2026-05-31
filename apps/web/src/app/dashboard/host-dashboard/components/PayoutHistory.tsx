'use client';

import type { PayoutRecord } from '../types';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PayoutHistoryProps {
  payouts: PayoutRecord[];
}

export default function PayoutHistory({ payouts }: PayoutHistoryProps) {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h3>

      <div className="space-y-3">
        {payouts.map((payout) => {
          const config = statusConfig[payout.status];
          const Icon = config.icon;

          return (
            <div
              key={payout.id}
              className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 ${config.bg}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={config.color} />
                <div>
                  <p className="font-medium text-gray-900">{payout.method}</p>
                  <p className="text-sm text-gray-500">
                    {payout.date.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{payout.amount} USDC</p>
                <p className="text-xs text-gray-500 capitalize">{payout.status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
