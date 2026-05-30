#!/usr/bin/env bash
# =============================================================================
# test-booking.sh
# CLI tests for the Booking Soroban contract.
#
# Covers:
#   - initialize   (already done by setup.sh; double-init rejection)
#   - create_booking  (happy path, invalid dates, invalid price, overlap)
#   - check_availability  (empty, blocked, after cancel)
#   - get_booking / get_property_bookings / booking_count
#   - cancel_booking  (tenant, unauthorized, already-cancelled, completed)
#   - update_status   (valid transitions, invalid transitions, unauthorized)
#   - set_escrow_id   (admin, unauthorized)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=utils/network-config.sh
source "${SCRIPT_DIR}/utils/network-config.sh"
# shellcheck source=utils/test-helpers.sh
source "${SCRIPT_DIR}/utils/test-helpers.sh"

load_state

require_env "BOOKING_CONTRACT_ID"
require_env "ADMIN_ADDRESS"
require_env "TENANT_ADDRESS"

CONTRACT_ID="${BOOKING_CONTRACT_ID}"

log_section "Booking Contract Tests"
log_info "Contract ID : ${CONTRACT_ID}"
log_info "Admin       : ${ADMIN_ADDRESS}"
log_info "Tenant      : ${TENANT_ADDRESS}"

# ── Helpers ───────────────────────────────────────────────────────────────────
invoke_admin() {
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

invoke_tenant() {
  invoke_as "${TENANT_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

# Timestamps: use fixed future Unix timestamps (year 2030+) to avoid conflicts
# across test runs.  Each test block uses a distinct property_id to isolate
# overlap checks.
TS_BASE=1893456000   # 2030-01-01 00:00:00 UTC
TS_WEEK=$((TS_BASE + 604800))   # +7 days
TS_2W=$((TS_BASE + 1209600))    # +14 days
TS_3W=$((TS_BASE + 1814400))    # +21 days
TS_4W=$((TS_BASE + 2419200))    # +28 days

# ── 1. booking_count starts at zero ──────────────────────────────────────────
log_section "1. booking_count"

assert_output_contains \
  "booking_count is 0 on fresh contract" \
  "0" \
  invoke_tenant booking_count

# ── 2. Double-initialize rejection ───────────────────────────────────────────
log_section "2. Double-initialize rejection"

assert_failure \
  "initialize panics when called a second time" \
  invoke_admin initialize --admin "${ADMIN_ADDRESS}"

# ── 3. create_booking — happy path ───────────────────────────────────────────
log_section "3. create_booking — happy path"

BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 1 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 7000000000 2>&1 | tail -1)

log_info "Created booking ID: ${BOOKING_ID}"

assert_output_contains \
  "booking_count increments to 1" \
  "1" \
  invoke_tenant booking_count

assert_output_contains \
  "get_booking returns Pending status" \
  "Pending" \
  invoke_tenant get_booking --id "${BOOKING_ID}"

assert_output_contains \
  "get_booking returns correct property_id" \
  "1" \
  invoke_tenant get_booking --id "${BOOKING_ID}"

assert_output_contains \
  "get_booking returns correct total_price" \
  "7000000000" \
  invoke_tenant get_booking --id "${BOOKING_ID}"

# ── 4. create_booking — invalid inputs ───────────────────────────────────────
log_section "4. create_booking — invalid inputs"

assert_failure \
  "create_booking rejects check_in == check_out" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 2 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_BASE}" \
    --total_price 100

assert_failure \
  "create_booking rejects check_in > check_out" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 2 \
    --check_in "${TS_WEEK}" \
    --check_out "${TS_BASE}" \
    --total_price 100

assert_failure \
  "create_booking rejects zero price" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 2 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}" \
    --total_price 0

assert_failure \
  "create_booking rejects negative price" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 2 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}" \
    --total_price -- -1

# ── 5. Overlap prevention ─────────────────────────────────────────────────────
log_section "5. Overlap prevention"

# Property 1 already has a booking from TS_BASE to TS_WEEK
assert_failure \
  "create_booking rejects exact same dates on same property" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 1 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}" \
    --total_price 100

assert_failure \
  "create_booking rejects partial overlap (starts inside existing)" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 1 \
    --check_in "$((TS_BASE + 86400))" \
    --check_out "${TS_2W}" \
    --total_price 100

assert_success \
  "create_booking allows adjacent booking (check_out == next check_in)" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 1 \
    --check_in "${TS_WEEK}" \
    --check_out "${TS_2W}" \
    --total_price 100

assert_success \
  "create_booking allows same dates on a different property" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 99 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}" \
    --total_price 100

# ── 6. check_availability ─────────────────────────────────────────────────────
log_section "6. check_availability"

assert_output_contains \
  "check_availability returns true for property with no bookings" \
  "true" \
  invoke_tenant check_availability \
    --property_id 999 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}"

assert_output_contains \
  "check_availability returns false when dates overlap active booking" \
  "false" \
  invoke_tenant check_availability \
    --property_id 1 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}"

# ── 7. get_property_bookings ──────────────────────────────────────────────────
log_section "7. get_property_bookings"

assert_output_contains \
  "get_property_bookings returns booking IDs for property 1" \
  "${BOOKING_ID}" \
  invoke_tenant get_property_bookings --property_id 1

assert_output_contains \
  "get_property_bookings returns empty list for unknown property" \
  "[]" \
  invoke_tenant get_property_bookings --property_id 888

# ── 8. cancel_booking ─────────────────────────────────────────────────────────
log_section "8. cancel_booking"

# Create a fresh booking on property 10 for cancel tests
CANCEL_BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 10 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 500000000 2>&1 | tail -1)

log_info "Cancel-test booking ID: ${CANCEL_BOOKING_ID}"

assert_failure \
  "non-tenant cannot cancel booking" \
  invoke_as "${OWNER_IDENTITY}" --id "${CONTRACT_ID}" -- cancel_booking \
    --caller "${OWNER_ADDRESS}" \
    --booking_id "${CANCEL_BOOKING_ID}"

assert_success \
  "tenant can cancel their own pending booking" \
  invoke_tenant cancel_booking \
    --caller "${TENANT_ADDRESS}" \
    --booking_id "${CANCEL_BOOKING_ID}"

assert_output_contains \
  "get_booking reflects Cancelled status" \
  "Cancelled" \
  invoke_tenant get_booking --id "${CANCEL_BOOKING_ID}"

assert_failure \
  "cancel_booking panics when already cancelled" \
  invoke_tenant cancel_booking \
    --caller "${TENANT_ADDRESS}" \
    --booking_id "${CANCEL_BOOKING_ID}"

# ── 9. check_availability after cancel ───────────────────────────────────────
log_section "9. check_availability after cancel"

assert_output_contains \
  "check_availability returns true after booking is cancelled" \
  "true" \
  invoke_tenant check_availability \
    --property_id 10 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}"

# Cancelled slot can be rebooked
assert_success \
  "cancelled slot can be rebooked" \
  invoke_tenant create_booking \
    --tenant "${TENANT_ADDRESS}" \
    --property_id 10 \
    --check_in "${TS_BASE}" \
    --check_out "${TS_WEEK}" \
    --total_price 500000000

# ── 10. update_status — valid transitions ────────────────────────────────────
log_section "10. update_status — valid transitions"

# Create a fresh booking on property 20 for status tests
STATUS_BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 20 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 1000000000 2>&1 | tail -1)

log_info "Status-test booking ID: ${STATUS_BOOKING_ID}"

assert_success \
  "admin can transition Pending → Confirmed" \
  invoke_admin update_status \
    --caller "${ADMIN_ADDRESS}" \
    --booking_id "${STATUS_BOOKING_ID}" \
    --new_status '{"Confirmed":{}}'

assert_output_contains \
  "get_booking reflects Confirmed status" \
  "Confirmed" \
  invoke_tenant get_booking --id "${STATUS_BOOKING_ID}"

assert_success \
  "admin can transition Confirmed → Completed" \
  invoke_admin update_status \
    --caller "${ADMIN_ADDRESS}" \
    --booking_id "${STATUS_BOOKING_ID}" \
    --new_status '{"Completed":{}}'

assert_output_contains \
  "get_booking reflects Completed status" \
  "Completed" \
  invoke_tenant get_booking --id "${STATUS_BOOKING_ID}"

# ── 11. update_status — invalid transitions ───────────────────────────────────
log_section "11. update_status — invalid transitions"

# Create another booking for invalid-transition tests
INVALID_BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 30 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 100 2>&1 | tail -1)

assert_failure \
  "Pending → Completed is an invalid transition" \
  invoke_admin update_status \
    --caller "${ADMIN_ADDRESS}" \
    --booking_id "${INVALID_BOOKING_ID}" \
    --new_status '{"Completed":{}}'

# Advance to Cancelled (terminal)
invoke_admin update_status \
  --caller "${ADMIN_ADDRESS}" \
  --booking_id "${INVALID_BOOKING_ID}" \
  --new_status '{"Cancelled":{}}' > /dev/null 2>&1

assert_failure \
  "Cancelled → Confirmed is an invalid transition (terminal)" \
  invoke_admin update_status \
    --caller "${ADMIN_ADDRESS}" \
    --booking_id "${INVALID_BOOKING_ID}" \
    --new_status '{"Confirmed":{}}'

# ── 12. update_status — unauthorized ─────────────────────────────────────────
log_section "12. update_status — unauthorized"

NON_ADMIN_BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 40 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 100 2>&1 | tail -1)

assert_failure \
  "non-admin cannot call update_status" \
  invoke_tenant update_status \
    --caller "${TENANT_ADDRESS}" \
    --booking_id "${NON_ADMIN_BOOKING_ID}" \
    --new_status '{"Confirmed":{}}'

# ── 13. set_escrow_id ─────────────────────────────────────────────────────────
log_section "13. set_escrow_id"

ESCROW_BOOKING_ID=$(invoke_tenant create_booking \
  --tenant "${TENANT_ADDRESS}" \
  --property_id 50 \
  --check_in "${TS_BASE}" \
  --check_out "${TS_WEEK}" \
  --total_price 100 2>&1 | tail -1)

assert_success \
  "admin can attach an escrow ID to a booking" \
  invoke_admin set_escrow_id \
    --caller "${ADMIN_ADDRESS}" \
    --booking_id "${ESCROW_BOOKING_ID}" \
    --escrow_id "escrow-abc-123"

assert_output_contains \
  "get_booking reflects escrow_id" \
  "escrow-abc-123" \
  invoke_tenant get_booking --id "${ESCROW_BOOKING_ID}"

assert_failure \
  "non-admin cannot set escrow ID" \
  invoke_tenant set_escrow_id \
    --caller "${TENANT_ADDRESS}" \
    --booking_id "${ESCROW_BOOKING_ID}" \
    --escrow_id "evil-escrow"

# ── 14. get_booking — not found ───────────────────────────────────────────────
log_section "14. get_booking — not found"

assert_failure \
  "get_booking panics for non-existent ID" \
  invoke_tenant get_booking --id 9999

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary "Booking Tests"
