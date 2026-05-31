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

export function getNetworkPassphrase(network: 'testnet' | 'mainnet' = 'testnet'): string {
  return STELLAR_NETWORKS[network].passphrase;
}
