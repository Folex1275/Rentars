#!/bin/bash

# Property and booking endpoints tests
# Usage: ./endpoints.test.sh [API_URL] [AUTH_TOKEN]

API_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"
PASSED=0
FAILED=0

echo "🧪 Running endpoint tests against $API_URL"
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

# Test 1: Get all properties
echo -n "Test 1: GET /api/properties... "
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 2: Get single property (assuming ID 1 exists)
echo -n "Test 2: GET /api/properties/1... "
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/properties/1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 3: Create property (requires auth)
echo -n "Test 3: POST /api/properties (create)... "
RESPONSE=$(auth_curl POST "/api/properties" '{
  "title": "Test Property",
  "description": "A test property",
  "price_per_night": 100,
  "location": "Test City",
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["wifi", "kitchen"]
}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
  # Extract property ID for later tests
  PROPERTY_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 4: Update property (requires auth)
if [ -n "$PROPERTY_ID" ]; then
  echo -n "Test 4: PUT /api/properties/$PROPERTY_ID (update)... "
  RESPONSE=$(auth_curl PUT "/api/properties/$PROPERTY_ID" '{
    "title": "Updated Property",
    "price_per_night": 150
  }')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASSED"
    ((PASSED++))
  else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
    ((FAILED++))
  fi
fi

# Test 5: Get all bookings
echo -n "Test 5: GET /api/bookings... "
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/bookings")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 6: Create booking (requires auth)
echo -n "Test 6: POST /api/bookings (create)... "
RESPONSE=$(auth_curl POST "/api/bookings" '{
  "property_id": "1",
  "check_in": "2026-06-01",
  "check_out": "2026-06-05",
  "total_price": 500
}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED"
  ((PASSED++))
  BOOKING_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
elif [ "$HTTP_CODE" = "401" ]; then
  echo "⚠️  SKIPPED (requires authentication)"
else
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 7: Get single booking
if [ -n "$BOOKING_ID" ]; then
  echo -n "Test 7: GET /api/bookings/$BOOKING_ID... "
  RESPONSE=$(auth_curl GET "/api/bookings/$BOOKING_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASSED"
    ((PASSED++))
  else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
    ((FAILED++))
  fi
fi

# Test 8: Invalid endpoint
echo -n "Test 8: GET /api/invalid (should 404)... "
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/invalid")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASSED"
  ((PASSED++))
else
  echo "❌ FAILED (HTTP $HTTP_CODE, expected 404)"
  ((FAILED++))
fi

echo "================================================"
echo "Results: $PASSED passed, $FAILED failed"
exit $FAILED
