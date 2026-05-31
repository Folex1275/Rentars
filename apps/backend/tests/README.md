# Backend Tests

This directory contains test suites for the Rentars backend API.

## Test Types

### Unit Tests (`unit/`)

Unit tests for individual services and functions.

**Running unit tests:**
```bash
cd apps/backend
bun test
```

**Test files:**
- `sync-service.test.ts` - Tests for blockchain sync service

### API Tests (`api/`)

Shell-based API endpoint tests using curl for quick manual and CI testing.

**Prerequisites:**
- Backend API running on `http://localhost:3000` (or specify custom URL)
- `curl` installed

**Running API tests:**

1. **Simple tests** (health check, auth):
```bash
./tests/api/simple.test.sh [API_URL]
```

Example:
```bash
./tests/api/simple.test.sh http://localhost:3000
```

2. **Endpoint tests** (properties, bookings):
```bash
./tests/api/endpoints.test.sh [API_URL] [AUTH_TOKEN]
```

Example:
```bash
./tests/api/endpoints.test.sh http://localhost:3000 "your-jwt-token"
```

3. **Profile tests** (user profile, auth):
```bash
./tests/api/profile.test.sh [API_URL] [AUTH_TOKEN]
```

Example:
```bash
./tests/api/profile.test.sh http://localhost:3000 "your-jwt-token"
```

### Docker Integration Tests (`docker/`)

Full-stack integration tests using Docker Compose.

**Prerequisites:**
- Docker and Docker Compose installed
- `docker-compose.yml` configured in project root

**Running Docker tests:**

1. **Integration tests** (full stack):
```bash
./tests/docker/integration.test.sh
```

2. **Validation tests** (Docker build and health):
```bash
./tests/docker/validate.test.sh
```

## npm Scripts

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "test": "bun test",
    "test:api": "bash tests/api/simple.test.sh && bash tests/api/endpoints.test.sh && bash tests/api/profile.test.sh",
    "test:docker": "bash tests/docker/integration.test.sh"
  }
}
```

Then run:
```bash
npm run test:api
npm run test:docker
```

## Test Coverage

- **Unit Tests**: Sync service (property sync, booking sync, batch operations)
- **API Tests**: 
  - Health checks
  - Authentication (register, login)
  - Properties (list, get, create, update, delete)
  - Bookings (list, get, create, update)
  - Profile (get, update, change password)
- **Integration Tests**: Full stack with Docker

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run API tests
  run: bash apps/backend/tests/api/simple.test.sh http://localhost:3000

- name: Run Docker integration tests
  run: bash apps/backend/tests/docker/integration.test.sh
```

## Troubleshooting

**Tests fail with "Connection refused":**
- Ensure backend is running: `cd apps/backend && bun run dev`
- Check API URL is correct

**Tests fail with "401 Unauthorized":**
- Some tests require authentication
- Pass a valid JWT token as the second argument

**Docker tests fail:**
- Ensure Docker daemon is running
- Check `docker-compose.yml` exists and is valid
- Run `docker-compose up -d` manually to debug

## Contributing

When adding new endpoints:
1. Add corresponding test in `api/endpoints.test.sh` or `api/profile.test.sh`
2. Update this README with new test coverage
3. Ensure tests pass before submitting PR
