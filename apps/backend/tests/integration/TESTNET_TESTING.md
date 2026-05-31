# Testnet Testing Guide

This document explains how to run blockchain integration tests against the Stellar testnet.

## Prerequisites

- Bun >= 1.0
- Node.js >= 20
- Stellar CLI installed
- A Stellar testnet account with XLM funds

## Setup

### 1. Create Test Accounts

Generate test keypairs for owner and tenant:

```bash
stellar keys generate --testnet owner
stellar keys generate --testnet tenant
```

### 2. Fund Test Accounts

Fund your test accounts with testnet XLM using the Stellar Friendbot:

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys show owner --testnet)"
curl "https://friendbot.stellar.org?addr=$(stellar keys show tenant --testnet)"
```

### 3. Configure Environment

Create a `.env.testnet` file in `apps/backend/`:

```env
STELLAR_NETWORK=testnet
STELLAR_OWNER_SECRET_KEY=<owner-secret-key>
STELLAR_TENANT_SECRET_KEY=<tenant-secret-key>
SOROBAN_CONTRACT_ID=<contract-id>
RUN_TESTNET_TESTS=true
```

## Running Tests

### Run All Testnet Tests

```bash
cd apps/backend
bun run test:testnet
```

### Run Specific Test File

```bash
RUN_TESTNET_TESTS=true bun test tests/integration/blockchain-integration.test.ts
```

### Run with Verbose Output

```bash
RUN_TESTNET_TESTS=true bun test tests/integration/blockchain-integration.test.ts --verbose
```

## Test Coverage

The testnet tests cover:

1. **Property Listing Creation**
   - Creating a property listing on testnet
   - Verifying transaction success
   - Checking on-chain state

2. **Booking Creation**
   - Creating a booking with valid parameters
   - Verifying escrow creation
   - Checking booking status

3. **Escrow Management**
   - Creating escrow via TrustlessWork API
   - Verifying escrow conditions
   - Testing escrow release

4. **Error Handling**
   - Insufficient funds
   - Invalid contract addresses
   - Network timeouts

## CI/CD Integration

In CI/CD pipelines, testnet tests are skipped by default. To enable them:

```bash
RUN_TESTNET_TESTS=true bun run test:testnet
```

### GitHub Actions Example

```yaml
- name: Run Testnet Tests
  if: github.event_name == 'workflow_dispatch'
  env:
    RUN_TESTNET_TESTS: true
    STELLAR_OWNER_SECRET_KEY: ${{ secrets.STELLAR_OWNER_SECRET_KEY }}
    STELLAR_TENANT_SECRET_KEY: ${{ secrets.STELLAR_TENANT_SECRET_KEY }}
  run: |
    cd apps/backend
    bun run test:testnet
```

## Debugging

### View Transaction Details

```bash
stellar tx info <transaction-hash> --testnet
```

### Check Account Balance

```bash
stellar account info $(stellar keys show owner --testnet) --testnet
```

### View Contract State

```bash
stellar contract invoke \
  --id <contract-id> \
  --source owner \
  --network testnet \
  -- get_property 1
```

## Troubleshooting

### "Insufficient funds" Error

Fund your test account again:

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys show owner --testnet)"
```

### "Contract not found" Error

Ensure the contract is deployed to testnet:

```bash
stellar contract deploy \
  --wasm apps/contracts/target/wasm32-unknown-unknown/release/rentars_contract.wasm \
  --source owner \
  --network testnet
```

### Tests Skipped

Ensure `RUN_TESTNET_TESTS=true` is set:

```bash
export RUN_TESTNET_TESTS=true
bun run test:testnet
```

## Best Practices

1. **Use Separate Test Accounts** - Don't use production accounts for testing
2. **Clean Up** - Delete test data after tests complete
3. **Monitor Costs** - Testnet is free, but monitor transaction counts
4. **Version Control** - Don't commit secret keys; use environment variables
5. **Idempotency** - Write tests that can run multiple times safely

## Resources

- [Stellar Testnet Documentation](https://developers.stellar.org/docs/learn/networks/testnet)
- [Soroban Testing Guide](https://developers.stellar.org/docs/learn/smart-contracts/testing)
- [Stellar CLI Reference](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
