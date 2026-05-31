import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api';

export async function isFreighterInstalled(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function getFreighterPublicKey(): Promise<string> {
  const result = await getAddress();
  if (result.error) {
    throw new Error(result.error.message || 'Failed to get address');
  }
  return result.address;
}

export async function signWithFreighter(xdr: string, network: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase: network,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to sign transaction');
  }
  return result.signedTxXdr;
}
