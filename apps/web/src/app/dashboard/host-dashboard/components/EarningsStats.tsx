'use client';

import { DollarSign, TrendingUp } from 'lucide-react';

interface EarningsStatsProps {
  thisMonth: number;
  lastMonth: number;
  totalEarnings: number;
  pendingPayout: number;
}

export default function EarningsStats({
  thisMonth,
  lastMonth,
  totalEarnings,
  pendingPayout,
}: EarningsStatsProps) {
  const growth = ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-blue-700 font-medium">This Month</p>
          <DollarSign size={20} className="text-blue-600" />
        </div>
        <p className="text-3xl font-bold text-blue-900">{thisMonth} USDC</p>
        <p className={`text-sm mt-2 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {growth >= 0 ? '+' : ''}{growth}% vs last month
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-6 border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-green-700 font-medium">Total Earnings</p>
          <TrendingUp size={20} className="text-green-600" />
        </div>
        <p className="text-3xl font-bold text-green-900">{totalEarnings} USDC</p>
        <p className="text-sm text-green-700 mt-2">Pending payout: {pendingPayout} USDC</p>
      </div>
    </div>
  );
}
