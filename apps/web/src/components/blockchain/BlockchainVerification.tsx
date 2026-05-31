'use client';

import { useEffect, useState } from 'react';
import { Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { getBlockchainStatus, verifyProperty, type BlockchainStatus } from '@/services/blockchain';

interface BlockchainVerificationProps {
  propertyId: string;
}

export default function BlockchainVerification({ propertyId }: BlockchainVerificationProps) {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [propertyId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBlockchainStatus(propertyId);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      const data = await verifyProperty(propertyId);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const copyHash = () => {
    if (status?.hash) {
      navigator.clipboard.writeText(status.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
        <Loader size={16} className="animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading verification status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Error</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status.verified ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : (
            <AlertCircle size={20} className="text-gray-400" />
          )}
          <span className="font-semibold text-gray-900">
            {status.verified ? 'Blockchain Verified' : 'Not Verified'}
          </span>
        </div>
        {status.pending && <span className="text-xs text-yellow-600 font-medium">Pending...</span>}
      </div>

      {status.hash && (
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Blockchain Hash</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-700 font-mono break-all">{status.hash}</code>
            <button
              onClick={copyHash}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy hash"
            >
              {copied ? (
                <CheckCircle size={14} className="text-green-600" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {status.lastVerified && (
        <p className="text-xs text-gray-500 mb-4">
          Last verified: {new Date(status.lastVerified).toLocaleString()}
        </p>
      )}

      {!status.verified && !status.pending && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          {verifying ? (
            <>
              <Loader size={14} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Now'
          )}
        </button>
      )}
    </div>
  );
}
