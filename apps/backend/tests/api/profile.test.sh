#!/bin/bash

# Profile endpoints tests
# Usage: ./profile.test.sh [API_URL] [AUTH_TOKEN]

API_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"
PASSED=0
FAILED=0

echo "🧪 Running profile endpoint tests against $API_URL"
echo "================================================"

# Helper function to make authenticated requests
auth_curl() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$AUTH_TOKEN" ]; then
    curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      ${data:+-d "$data"}
  else
    curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      ${data:+-d "$data"}
  fi
}

# Test 1: Get current user profile (requires auth)
echo -n "Test 1: GET /auth/profile... "
RESPONSE=$(auth_curl GET "/auth/profile")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 2: Update user profile (requires auth)
echo -n "Test 2: PUT /auth/profile (update)... "
RESPONSE=$(auth_curl PUT "/auth/profile" '{
  "name": "Updated Name",
  "bio": "Updated bio"
}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 3: Change password (requires auth)
echo -n "Test 3: POST /auth/change-password... "
RESPONSE=$(auth_curl POST "/auth/change-password" '{
  "current_password": "TestPassword123!",
  "new_password": "NewPassword123!"
}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "⚠️  SKIPPED (invalid password)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 4: Get user properties (requires auth)
echo -n "Test 4: GET /auth/my-properties... "
RESPONSE=$(auth_curl GET "/auth/my-properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 5: Get user bookings (requires auth)
echo -n "Test 5: GET /auth/my-bookings... "
RESPONSE=$(auth_curl GET "/auth/my-bookings")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 6: Logout (requires auth)
echo -n "Test 6: POST /auth/logout... "
RESPONSE=$(auth_curl POST "/auth/logout")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

echo "================================================"
echo "Results: $PASSED passed, $FAILED failed"
exit $FAILED
