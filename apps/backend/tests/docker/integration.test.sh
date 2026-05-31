#!/bin/bash

# Docker-based integration test suite
# Spins up full stack, runs tests, tears down
# Usage: ./integration.test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

echo "🐳 Docker Integration Test Suite"
echo "=================================="

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

echo "📦 Starting services with docker-compose..."
cd "$PROJECT_ROOT"

# Start services in detached mode
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
    break
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ Services failed to become healthy"
  docker-compose logs
  docker-compose down
  exit 1
fi

echo ""
echo "🧪 Running API test suite..."
echo "=================================="

# Run API tests
cd "$PROJECT_ROOT/apps/backend"

FAILED=0

# Run simple tests
echo ""
echo "Running simple tests..."
if bash tests/api/simple.test.sh http://localhost:3000; then
  echo "✅ Simple tests passed"
else
  echo "❌ Simple tests failed"
  FAILED=$((FAILED + 1))
fi

# Run endpoint tests
echo ""
echo "Running endpoint tests..."
if bash tests/api/endpoints.test.sh http://localhost:3000; then
  echo "✅ Endpoint tests passed"
else
  echo "❌ Endpoint tests failed"
  FAILED=$((FAILED + 1))
fi

# Run profile tests
echo ""
echo "Running profile tests..."
if bash tests/api/profile.test.sh http://localhost:3000; then
  echo "✅ Profile tests passed"
else
  echo "❌ Profile tests failed"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "🧹 Cleaning up..."
cd "$PROJECT_ROOT"
docker-compose down

echo ""
echo "=================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ All integration tests passed!"
  exit 0
else
  echo "❌ $FAILED test suite(s) failed"
  exit 1
fi
