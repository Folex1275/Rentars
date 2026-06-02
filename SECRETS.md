# Secrets Management

This document outlines the secrets required for the Rentars application and how to manage them securely.

## Required Secrets

### Backend (apps/backend)

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with admin privileges | Supabase Dashboard → Project Settings → API → "service_role" key |
| `JWT_SECRET` | Secret for signing JWT tokens | Generate a secure random string (min 32 characters) |
| `REDIS_URL` | Redis connection URL | Your Redis provider or local Redis |
| `TRUSTLESS_WORK_API_KEY` | API key for TrustlessWork escrow | TrustlessWork Dashboard |
| `GEOCODING_API_KEY` | Optional API key for geocoding services | Google Maps API or Mapbox |

### Frontend (apps/web)

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Configuration |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar network (testnet/mainnet) | Configuration |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint | Stellar Documentation |
| `NEXT_PUBLIC_PASSKEY_RP_ID` | Relying Party ID for WebAuthn | Your domain |

## Storage Guidelines

### Local Development

1. Copy `.env.example` to `.env.local` and fill in values
2. Never commit `.env.local` to version control
3. Use `.env.test` for test environments

### Production

1. Use `.env.production.example` as template
2. Store secrets in a secure secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)
3. Inject secrets as environment variables at runtime
4. Never hardcode secrets in code

## Best Practices

- **Never commit secrets** to version control
- **Rotate secrets regularly** (especially JWT_SECRET)
- **Use different secrets** for development, staging, and production
- **Limit access** to production secrets to essential team members only
- **Use secret scanning tools** to detect accidental commits
- **Encrypt sensitive data** in transit and at rest