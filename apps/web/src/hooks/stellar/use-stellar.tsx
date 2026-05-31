'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { deriveKeyFromPasskey } from '@/lib/passkey/stellar';
import { deployStellarSmartWallet } from '@/lib/passkey/deploy';

interface StellarContextType {
  keypair: StellarSdk.Keypair | null;
  publicKey: string | null;
  network: 'testnet' | 'mainnet';
  onRegister: (registrationResponse: any) => Promise<void>;
  prepareSign: () => Promise<string>;
  onSign: (signParams: any) => Promise<string>;
  deployee: string | null;
  loadingDeployee: boolean;
  loadingRegister: boolean;
  loadingSign: boolean;
}

const StellarContext = createContext<StellarContextType | undefined>(undefined);

export function StellarProvider({
  children,
  network = 'testnet',
}: {
  children: ReactNode;
  network?: 'testnet' | 'mainnet';
}) {
  const [keypair, setKeypair] = useState<StellarSdk.Keypair | null>(null);
  const [deployee, setDeployee] = useState<string | null>(null);
  const [loadingDeployee, setLoadingDeployee] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [loadingSign, setLoadingSign] = useState(false);

  const onRegister = useCallback(
    async (registrationResponse: any) => {
      setLoadingRegister(true);
      try {
        // Derive keypair from passkey registration response
        const credentialId = registrationResponse.id;
        const derivedKeypair = await deriveKeyFromPasskey(credentialId);
        setKeypair(derivedKeypair);

        // Deploy smart wallet
        setLoadingDeployee(true);
        const deploymentId = await deployStellarSmartWallet(derivedKeypair, network);
        setDeployee(deploymentId);
      } finally {
        setLoadingRegister(false);
        setLoadingDeployee(false);
      }
    },
    [network]
  );

  const prepareSign = useCallback(async (): Promise<string> => {
    if (!keypair) throw new Error('Keypair not initialized');
    // Return a placeholder transaction XDR
    return 'placeholder_xdr';
  }, [keypair]);

  const onSign = useCallback(
    async (signParams: any): Promise<string> => {
      setLoadingSign(true);
      try {
        if (!keypair) throw new Error('Keypair not initialized');
        // Sign the transaction
        const signature = keypair.sign(Buffer.from(signParams.data || ''));
        return signature.toString('base64');
      } finally {
        setLoadingSign(false);
      }
    },
    [keypair]
  );

  return (
    <StellarContext.Provider
      value={{
        keypair,
        publicKey: keypair?.publicKey() || null,
        network,
        onRegister,
        prepareSign,
        onSign,
        deployee,
        loadingDeployee,
        loadingRegister,
        loadingSign,
      }}
    >
      {children}
    </StellarContext.Provider>
  );
}

export function useStellar() {
  const context = useContext(StellarContext);
  if (!context) {
    throw new Error('useStellar must be used within StellarProvider');
  }
  return context;
}
