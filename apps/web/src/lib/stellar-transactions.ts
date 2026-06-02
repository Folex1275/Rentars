import * as StellarSdk from '@stellar/stellar-sdk';

import { getNetworkPassphrase } from '@/lib/network-utils';

// NOTE: This repo uses TrustlessWork for escrow creation/release.
// Freighter signing still signs a transaction that TrustlessWork expects.
// The exact operation set depends on the TrustlessWork flow and must match
// the backend/contract expectations.

const DEFAULT_NETWORK: 'testnet' | 'mainnet' = 'testnet';

export function buildEscrowFundingTransaction(
  escrowId: string,
  amount: string | number,
  tenantPublicKey: string,
  network: 'testnet' | 'mainnet' = DEFAULT_NETWORK,
): { xdr: string; txHash: string } {
  // Minimal placeholder payment-like tx structure.
  // Replace with TrustlessWork required contract call / memo scheme.
  const passphrase = getNetworkPassphrase(network);
  const sourceAccount = new StellarSdk.Account(tenantPublicKey, '0');

  const fee = '100';
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: passphrase,
  })
    .setTimeout(30)
    .addMemo(StellarSdk.Memo.text(`escrow:${escrowId}`))
    .build();

  const xdr = tx.toXDR();
  const txHash = ''; // populated after sign/submit
  return { xdr, txHash };
}

export function buildEscrowReleaseTransaction(
  escrowId: string,
  ownerPublicKey: string,
  network: 'testnet' | 'mainnet' = DEFAULT_NETWORK,
): { xdr: string; txHash: string } {
  const passphrase = getNetworkPassphrase(network);
  const sourceAccount = new StellarSdk.Account(ownerPublicKey, '0');

  const fee = '100';
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: passphrase,
  })
    .setTimeout(30)
    .addMemo(StellarSdk.Memo.text(`escrow-release:${escrowId}`))
    .build();

  const xdr = tx.toXDR();
  const txHash = '';
  return { xdr, txHash };
}

