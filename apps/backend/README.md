# Docker Setup for Rentars Backend

## Development

Run the backend with Redis using Docker Compose:

```bash
npm run docker:dev
```

This starts:
- **API**: http://localhost:3000
- **Redis**: localhost:6379

The API container mounts the local source code, so changes are reflected immediately.

## Production

Deploy with production-optimized settings:

```bash
npm run docker:prod
```

This uses `docker-compose.prod.yml` with:
- No volume mounts (immutable containers)
- Restart policies enabled
- Production environment variables

## Environment Variables

Create a `.env` file in `apps/backend/` with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
PROPERTY_LISTING_CONTRACT_ID=your_contract_id
BOOKING_CONTRACT_ID=your_contract_id
TRUSTLESS_WORK_API_URL=your_api_url
TRUSTLESS_WORK_API_KEY=your_api_key
```

## Building the Image

```bash
docker build -t rentars-backend .
```

## Stopping Containers

```bash
docker-compose down
```
