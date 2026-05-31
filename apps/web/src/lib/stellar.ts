import * as StellarSdk from '@stellar/stellar-sdk';

export const STELLAR_NETWORKS = {
  testnet: {
    name: 'Testnet',
    passphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    name: 'Mainnet',
    passphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-mainnet.stellar.org',
  },
};

export function getNetworkConfig(network: 'testnet' | 'mainnet' = 'testnet') {
  return STELLAR_NETWORKS[network];
}

export function getHorizonServer(network: 'testnet' | 'mainnet' = 'testnet') {
  const config = getNetworkConfig(network);
  return new StellarSdk.Horizon.Server(config.horizonUrl);
}
