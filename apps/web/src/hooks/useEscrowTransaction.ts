'use client';

import { useCallback, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getNetworkPassphrase, STELLAR_NETWORKS } from '@/lib/network-utils';
import { signWithFreighter } from '@/lib/freighter-utils';
import {
  buildEscrowFundingTransaction,
  buildEscrowReleaseTransaction,
} from '@/lib/stellar-transactions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type EscrowTxType = 'fund' | 'release';

export interface EscrowTransactionResult {
  txHash: string;
  explorerUrl: string;
}

function getExplorerUrl(txHash: string, network: 'testnet' | 'mainnet') {
  const base =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public/tx/'
      : 'https://stellar.expert/testnet/tx/';
  return `${base}${txHash}`;
}

async function submitXdrToHorizon(xdr: string, network: 'testnet' | 'mainnet') {
  const passphrase = getNetworkPassphrase(network);
  const tx = StellarSdk.Transaction.fromXDR(xdr, passphrase);
  const client = new StellarSdk.Horizon.Server(
    network === 'mainnet'
      ? STELLAR_NETWORKS.mainnet.horizonUrl
      : STELLAR_NETWORKS.testnet.horizonUrl,
  );

  // Horizon expects signed tx XDR
  const result = await client.submitTransaction(tx);
  return result.hash;
}

export function useEscrowTransaction(network: 'testnet' | 'mainnet' = 'testnet') {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (params: {
      type: EscrowTxType;
      escrowId: string;
      amount?: string | number;
      tenantPublicKey?: string;
      ownerPublicKey?: string;
      retryCount?: number;
    }): Promise<EscrowTransactionResult> => {
      const {
        type,
        escrowId,
        amount,
        tenantPublicKey,
        ownerPublicKey,
        retryCount = 3,
      } = params;

      setIsSubmitting(true);
      setError(null);

      let lastErr: unknown = null;
      for (let attempt = 0; attempt < retryCount; attempt++) {
        try {
          const { xdr } =
            type === 'fund'
              ? buildEscrowFundingTransaction(
                  escrowId,
                  amount ?? '0',
                  tenantPublicKey ?? '',
                  network,
                )
              : buildEscrowReleaseTransaction(
                  escrowId,
                  ownerPublicKey ?? '',
                  network,
                );

          // Sign via Freighter
          const signedXdr = await signWithFreighter(xdr, getNetworkPassphrase(network));

          // Submit to Stellar network
          const txHash = await submitXdrToHorizon(signedXdr, network);

          // Optionally notify backend that tx has been submitted.
          // TrustlessWork backend may need txHash to proceed.
          if (type === 'fund') {
            await fetch(`${API_URL}/api/v1/bookings/escrow/${escrowId}/fund`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: String(amount ?? '0'),
                txHash,
              }),
            });
          } else {
            await fetch(`${API_URL}/api/v1/bookings/escrow/${escrowId}/release`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reason: 'Release signed by owner',
                txHash,
              }),
            });
          }

          return {
            txHash,
            explorerUrl: getExplorerUrl(txHash, network),
          };
        } catch (err) {
          lastErr = err;
          // basic backoff before retry
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      const msg =
        lastErr instanceof Error ? lastErr.message : 'Failed to submit transaction';
      setError(msg);
      throw new Error(msg);
    },
    [network],
  );

  return { submit, isSubmitting, error };
}

