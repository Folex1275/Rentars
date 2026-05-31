'use client';

import { AlertCircle } from 'lucide-react';

export function FreighterFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <AlertCircle className="text-yellow-600 mb-3" size={24} />
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">Freighter Wallet Not Found</h3>
      <p className="text-yellow-700 text-sm mb-4 text-center">
        Please install the Freighter browser extension to connect your Stellar wallet.
      </p>
      <a
        href="https://www.freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
      >
        Install Freighter
      </a>
    </div>
  );
}
