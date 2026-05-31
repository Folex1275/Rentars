#!/bin/bash

# Docker build and container health validation
# Usage: ./validate.test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

echo "🔍 Docker Validation Test Suite"
echo "================================"

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ docker-compose.yml not found at $COMPOSE_FILE"
  exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker daemon is not running"
  exit 1
fi

echo "✅ Docker daemon is running"

# Validate docker-compose.yml syntax
echo ""
echo "Validating docker-compose.yml..."
if docker-compose -f "$COMPOSE_FILE" config > /dev/null 2>&1; then
  echo "✅ docker-compose.yml is valid"
else
  echo "❌ docker-compose.yml validation failed"
  exit 1
fi

# Build images
echo ""
echo "Building Docker images..."
cd "$PROJECT_ROOT"

if docker-compose build; then
  echo "✅ Docker images built successfully"
else
  echo "❌ Docker build failed"
  exit 1
fi

# Start services
echo ""
echo "Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
SERVICES_HEALTHY=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  # Check backend health
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    SERVICES_HEALTHY=$((SERVICES_HEALTHY + 1))
  fi
  
  if [ $SERVICES_HEALTHY -gt 0 ]; then
    echo "✅ Services are healthy"
    break
  fi
  
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
  sleep 2
done

if [ $SERVICES_HEALTHY -eq 0 ]; then
  echo "❌ Services failed to become healthy"
  echo ""
  echo "Container logs:"
  docker-compose logs
  docker-compose down
  exit 1
fi

# Check container status
echo ""
echo "Checking container status..."
CONTAINERS=$(docker-compose ps -q)
RUNNING_COUNT=$(docker-compose ps -q | wc -l)

if [ $RUNNING_COUNT -gt 0 ]; then
  echo "✅ $RUNNING_COUNT container(s) running"
  docker-compose ps
else
  echo "❌ No containers running"
  docker-compose down
  exit 1
fi

# Verify backend endpoint
echo ""
echo "Verifying backend endpoint..."
RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$RESPONSE" | grep -q "ok"; then
  echo "✅ Backend endpoint responding correctly"
  echo "   Response: $RESPONSE"
else
  echo "❌ Backend endpoint not responding correctly"
  docker-compose down
  exit 1
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
docker-compose down

echo ""
echo "================================"
echo "✅ All validation tests passed!"
exit 0
