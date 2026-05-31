import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';

export async function isFreighterInstalled(): Promise<boolean> {
  return await isConnected();
}

export async function getFreighterPublicKey(): Promise<string> {
  return await getPublicKey();
}

export async function signWithFreighter(xdr: string, network: string): Promise<string> {
  return await signTransaction(xdr, {
    networkPassphrase: network,
  });
}
