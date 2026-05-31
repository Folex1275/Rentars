#!/bin/bash

# Simple health check and auth tests
# Usage: ./simple.test.sh [API_URL]

API_URL="${1:-http://localhost:3000}"
PASSED=0
FAILED=0

echo "🧪 Running simple API tests against $API_URL"
echo "================================================"

# Test 1: Health check
echo -n "Test 1: Health check... "
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 2: Register user
echo -n "Test 2: Register user... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "409" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 3: Login user
echo -n "Test 3: Login user... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
  # Extract token for later use
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 4: Invalid login
echo -n "Test 4: Invalid login (should fail)... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@example.com",
    "password": "WrongPassword"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE, expected 401 or 400)"
  ((FAILED++))
fi

echo "================================================"
echo "Results: $PASSED passed, $FAILED failed"
exit $FAILED
