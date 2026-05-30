#!/usr/bin/env bash
# =============================================================================
# test-property-listing.sh
# CLI tests for the PropertyListing Soroban contract.
#
# Covers:
#   - create_listing  (happy path, invalid price, empty title)
#   - get_listing     (existing, non-existent)
#   - update_listing  (owner, unauthorized, invalid inputs)
#   - update_status   (Active → Inactive → Rented → Active, unauthorized)
#   - listing_count
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=utils/network-config.sh
source "${SCRIPT_DIR}/utils/network-config.sh"
# shellcheck source=utils/test-helpers.sh
source "${SCRIPT_DIR}/utils/test-helpers.sh"

# Load deployed contract addresses from setup.sh
load_state

require_env "PROPERTY_LISTING_CONTRACT_ID"
require_env "OWNER_ADDRESS"

CONTRACT_ID="${PROPERTY_LISTING_CONTRACT_ID}"

log_section "Property Listing Contract Tests"
log_info "Contract ID : ${CONTRACT_ID}"
log_info "Owner       : ${OWNER_ADDRESS}"

# ── Helpers ───────────────────────────────────────────────────────────────────
invoke_owner() {
  invoke_as "${OWNER_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

invoke_admin() {
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

# ── 1. listing_count starts at zero ──────────────────────────────────────────
log_section "1. listing_count"

assert_output_contains \
  "listing_count returns 0 on fresh contract" \
  "0" \
  invoke_owner listing_count

# ── 2. create_listing — happy path ───────────────────────────────────────────
log_section "2. create_listing — happy path"

assert_success \
  "create_listing with valid inputs returns ID" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "Mountain Cabin" \
    --description "Peaceful retreat in the Alps" \
    --price_per_night 500000000

# Capture the listing ID for subsequent tests
LISTING_ID=$(invoke_owner create_listing \
  --owner "${OWNER_ADDRESS}" \
  --title "Beach House" \
  --description "Oceanfront property with stunning views" \
  --price_per_night 1000000000 2>&1 | tail -1)

log_info "Created listing ID: ${LISTING_ID}"

assert_output_contains \
  "listing_count increments after creates" \
  "2" \
  invoke_owner listing_count

# ── 3. get_listing ────────────────────────────────────────────────────────────
log_section "3. get_listing"

assert_output_contains \
  "get_listing returns correct title" \
  "Beach House" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_output_contains \
  "get_listing returns Active status" \
  "Active" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_output_contains \
  "get_listing returns correct price" \
  "1000000000" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_failure \
  "get_listing panics for non-existent ID" \
  invoke_owner get_listing --id 9999

# ── 4. update_listing — owner ─────────────────────────────────────────────────
log_section "4. update_listing — owner"

assert_success \
  "owner can update title, description, and price" \
  invoke_owner update_listing \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --title "Updated Beach House" \
    --description "Renovated with ocean view" \
    --price_per_night 1500000000

assert_output_contains \
  "get_listing reflects updated title" \
  "Updated Beach House" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_output_contains \
  "get_listing reflects updated price" \
  "1500000000" \
  invoke_owner get_listing --id "${LISTING_ID}"

# ── 5. update_listing — unauthorized ─────────────────────────────────────────
log_section "5. update_listing — unauthorized"

assert_failure \
  "non-owner cannot update listing" \
  invoke_as "${TENANT_IDENTITY}" --id "${CONTRACT_ID}" -- update_listing \
    --caller "${TENANT_ADDRESS}" \
    --id "${LISTING_ID}" \
    --title "Hacked Title" \
    --description "Hacked" \
    --price_per_night 1

# ── 6. update_listing — invalid inputs ───────────────────────────────────────
log_section "6. update_listing — invalid inputs"

assert_failure \
  "update_listing rejects zero price" \
  invoke_owner update_listing \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --title "Valid Title" \
    --description "desc" \
    --price_per_night 0

assert_failure \
  "update_listing rejects empty title" \
  invoke_owner update_listing \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --title "" \
    --description "desc" \
    --price_per_night 100000000

# ── 7. create_listing — invalid inputs ───────────────────────────────────────
log_section "7. create_listing — invalid inputs"

assert_failure \
  "create_listing rejects zero price" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "Free House" \
    --description "desc" \
    --price_per_night 0

assert_failure \
  "create_listing rejects negative price" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "Negative House" \
    --description "desc" \
    --price_per_night -- -1

assert_failure \
  "create_listing rejects empty title" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "" \
    --description "desc" \
    --price_per_night 100000000

# ── 8. update_status ─────────────────────────────────────────────────────────
log_section "8. update_status"

assert_success \
  "owner can set status to Inactive" \
  invoke_owner update_status \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --status '{"Inactive":{}}'

assert_output_contains \
  "get_listing reflects Inactive status" \
  "Inactive" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_success \
  "owner can set status to Rented" \
  invoke_owner update_status \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --status '{"Rented":{}}'

assert_output_contains \
  "get_listing reflects Rented status" \
  "Rented" \
  invoke_owner get_listing --id "${LISTING_ID}"

assert_success \
  "owner can set status back to Active" \
  invoke_owner update_status \
    --caller "${OWNER_ADDRESS}" \
    --id "${LISTING_ID}" \
    --status '{"Active":{}}'

assert_output_contains \
  "get_listing reflects Active status again" \
  "Active" \
  invoke_owner get_listing --id "${LISTING_ID}"

# ── 9. update_status — unauthorized ──────────────────────────────────────────
log_section "9. update_status — unauthorized"

assert_failure \
  "non-owner cannot change listing status" \
  invoke_as "${TENANT_IDENTITY}" --id "${CONTRACT_ID}" -- update_status \
    --caller "${TENANT_ADDRESS}" \
    --id "${LISTING_ID}" \
    --status '{"Inactive":{}}'

# ── 10. Edge cases ────────────────────────────────────────────────────────────
log_section "10. Edge cases"

assert_success \
  "create_listing with minimum price (1 stroop) succeeds" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "A" \
    --description "" \
    --price_per_night 1

assert_success \
  "create_listing with single-char title succeeds" \
  invoke_owner create_listing \
    --owner "${OWNER_ADDRESS}" \
    --title "X" \
    --description "Minimal listing" \
    --price_per_night 100000000

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary "Property Listing Tests"
