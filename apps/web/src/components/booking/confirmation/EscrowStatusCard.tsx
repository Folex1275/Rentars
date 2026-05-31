'use client';

import { Lock, CheckCircle, RefreshCw } from 'lucide-react';

interface EscrowStatusCardProps {
  status: 'locked' | 'released' | 'refunded';
  amount: number;
  releaseDate?: string;
}

export default function EscrowStatusCard({
  status,
  amount,
  releaseDate,
}: EscrowStatusCardProps) {
  const statusConfig = {
    locked: {
      icon: Lock,
      label: 'Escrow Locked',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    released: {
      icon: CheckCircle,
      label: 'Escrow Released',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    refunded: {
      icon: RefreshCw,
      label: 'Refunded',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} rounded-lg p-4 border border-gray-200`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={config.color} size={20} />
        <h3 className="font-semibold text-gray-900">{config.label}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">{amount} USDC</p>
      {releaseDate && (
        <p className="text-sm text-gray-600">
          Release date: {new Date(releaseDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
