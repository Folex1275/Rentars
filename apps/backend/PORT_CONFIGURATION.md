# Port Configuration

## Default Ports

| Service | Port | Environment Variable |
|---------|------|----------------------|
| API | 3000 | `PORT` |
| Redis | 6379 | `REDIS_URL` |

## Port Conflict Resolution

The `findAvailablePort()` utility automatically detects port conflicts and increments to the next available port.

### Usage

```typescript
import { findAvailablePort } from './utils/port.util.js';

const port = await findAvailablePort(3000);
console.log(`Server running on port ${port}`);
```

If port 3000 is in use, it will try 3001, 3002, etc., until an available port is found.

## Docker Ports

- **Development**: Ports are exposed as configured in `docker-compose.yml`
- **Production**: Only necessary ports are exposed in `docker-compose.prod.yml`

## Environment Configuration

All required environment variables are validated on startup. Missing or invalid variables will throw descriptive errors.

See `.env.example` for all available configuration options.
