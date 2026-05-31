'use client';

import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { BlockchainStatus } from '@/services/blockchain';

interface BlockchainStatusBadgeProps {
  status: BlockchainStatus;
}

export default function BlockchainStatusBadge({ status }: BlockchainStatusBadgeProps) {
  if (status.pending) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
        <Clock size={12} />
        Verifying...
      </div>
    );
  }

  if (status.verified) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircle size={12} />
        Verified
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
      <AlertCircle size={12} />
      Unverified
    </div>
  );
}
