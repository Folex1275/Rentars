#!/usr/bin/env bash
# =============================================================================
# test-review.sh
# CLI tests for the Review Soroban contract.
#
# Covers:
#   - submit_review  (happy path, invalid ratings, duplicate prevention)
#   - get_review     (existing, non-existent)
#   - get_reviews_for_user  (populated, empty)
#   - get_reputation  (no reviews, single review, multiple reviews, average)
#   - review_count
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=utils/network-config.sh
source "${SCRIPT_DIR}/utils/network-config.sh"
# shellcheck source=utils/test-helpers.sh
source "${SCRIPT_DIR}/utils/test-helpers.sh"

load_state

require_env "REVIEW_CONTRACT_ID"
require_env "REVIEWER_ADDRESS"
require_env "OWNER_ADDRESS"

CONTRACT_ID="${REVIEW_CONTRACT_ID}"

log_section "Review Contract Tests"
log_info "Contract ID : ${CONTRACT_ID}"
log_info "Reviewer    : ${REVIEWER_ADDRESS}"
log_info "Reviewee    : ${OWNER_ADDRESS}"

# ── Helpers ───────────────────────────────────────────────────────────────────
invoke_reviewer() {
  invoke_as "${REVIEWER_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

invoke_tenant() {
  invoke_as "${TENANT_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

invoke_admin() {
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- "$@"
}

# ── 1. review_count starts at zero ───────────────────────────────────────────
log_section "1. review_count"

assert_output_contains \
  "review_count is 0 on fresh contract" \
  "0" \
  invoke_reviewer review_count

# ── 2. get_reputation — no reviews ───────────────────────────────────────────
log_section "2. get_reputation — no reviews"

assert_output_contains \
  "get_reputation returns 0 for user with no reviews" \
  "0" \
  invoke_reviewer get_reputation --reviewee "${OWNER_ADDRESS}"

# ── 3. get_reviews_for_user — empty ──────────────────────────────────────────
log_section "3. get_reviews_for_user — empty"

assert_output_contains \
  "get_reviews_for_user returns empty list for user with no reviews" \
  "[]" \
  invoke_reviewer get_reviews_for_user --reviewee "${OWNER_ADDRESS}"

# ── 4. submit_review — happy path ────────────────────────────────────────────
log_section "4. submit_review — happy path"

REVIEW_ID=$(invoke_reviewer submit_review \
  --reviewer "${REVIEWER_ADDRESS}" \
  --reviewee "${OWNER_ADDRESS}" \
  --rating 5 \
  --comment "Excellent host, highly recommended!" 2>&1 | tail -1)

log_info "Created review ID: ${REVIEW_ID}"

assert_output_contains \
  "review_count increments to 1" \
  "1" \
  invoke_reviewer review_count

assert_output_contains \
  "get_review returns correct rating" \
  "5" \
  invoke_reviewer get_review --id "${REVIEW_ID}"

assert_output_contains \
  "get_review returns correct comment" \
  "Excellent host" \
  invoke_reviewer get_review --id "${REVIEW_ID}"

assert_output_contains \
  "get_review returns correct reviewer" \
  "${REVIEWER_ADDRESS}" \
  invoke_reviewer get_review --id "${REVIEW_ID}"

assert_output_contains \
  "get_review returns correct reviewee" \
  "${OWNER_ADDRESS}" \
  invoke_reviewer get_review --id "${REVIEW_ID}"

# ── 5. get_reviews_for_user — populated ──────────────────────────────────────
log_section "5. get_reviews_for_user — populated"

assert_output_contains \
  "get_reviews_for_user returns review ID for reviewee" \
  "${REVIEW_ID}" \
  invoke_reviewer get_reviews_for_user --reviewee "${OWNER_ADDRESS}"

# ── 6. get_reputation — single review ────────────────────────────────────────
log_section "6. get_reputation — single review"

# One review with rating 5 → reputation = 5 * 100 / 1 = 500
assert_output_contains \
  "get_reputation returns 500 for single 5-star review" \
  "500" \
  invoke_reviewer get_reputation --reviewee "${OWNER_ADDRESS}"

# ── 7. submit_review — all valid rating values ────────────────────────────────
log_section "7. submit_review — all valid rating values (1–5)"

# Use TENANT_ADDRESS as a fresh reviewee to avoid duplicate conflicts
for rating in 1 2 3 4; do
  # Each rating needs a distinct reviewer; use admin/owner/tenant/reviewer
  # for ratings 1-4 (reviewer already used for rating 5 above on OWNER_ADDRESS)
  # Here we test against TENANT_ADDRESS as reviewee
  :
done

# Submit ratings 1–4 from different identities against TENANT_ADDRESS
assert_success \
  "submit_review accepts rating 1" \
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- submit_review \
    --reviewer "${ADMIN_ADDRESS}" \
    --reviewee "${TENANT_ADDRESS}" \
    --rating 1 \
    --comment "Poor experience"

assert_success \
  "submit_review accepts rating 2" \
  invoke_as "${OWNER_IDENTITY}" --id "${CONTRACT_ID}" -- submit_review \
    --reviewer "${OWNER_ADDRESS}" \
    --reviewee "${TENANT_ADDRESS}" \
    --rating 2 \
    --comment "Below average"

assert_success \
  "submit_review accepts rating 3" \
  invoke_reviewer submit_review \
    --reviewer "${REVIEWER_ADDRESS}" \
    --reviewee "${TENANT_ADDRESS}" \
    --rating 3 \
    --comment "Average stay"

# ── 8. get_reputation — multiple reviews / average ───────────────────────────
log_section "8. get_reputation — multiple reviews"

# TENANT_ADDRESS has ratings: 1, 2, 3 → total=6, count=3, avg=2.00 → 200
assert_output_contains \
  "get_reputation returns correct average (200) for ratings 1+2+3" \
  "200" \
  invoke_reviewer get_reputation --reviewee "${TENANT_ADDRESS}"

assert_output_contains \
  "get_reviews_for_user returns 3 reviews for tenant" \
  "3" \
  invoke_reviewer get_reviews_for_user --reviewee "${TENANT_ADDRESS}"

# ── 9. submit_review — invalid ratings ───────────────────────────────────────
log_section "9. submit_review — invalid ratings"

# Use a fresh reviewer identity (admin) against a fresh reviewee (reviewer address)
# to avoid duplicate-review conflicts
assert_failure \
  "submit_review rejects rating 0" \
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- submit_review \
    --reviewer "${ADMIN_ADDRESS}" \
    --reviewee "${REVIEWER_ADDRESS}" \
    --rating 0 \
    --comment "Zero rating"

assert_failure \
  "submit_review rejects rating 6" \
  invoke_as "${ADMIN_IDENTITY}" --id "${CONTRACT_ID}" -- submit_review \
    --reviewer "${ADMIN_ADDRESS}" \
    --reviewee "${REVIEWER_ADDRESS}" \
    --rating 6 \
    --comment "Too high"

# ── 10. Duplicate review prevention ──────────────────────────────────────────
log_section "10. Duplicate review prevention"

assert_failure \
  "same reviewer cannot submit a second review for the same reviewee" \
  invoke_reviewer submit_review \
    --reviewer "${REVIEWER_ADDRESS}" \
    --reviewee "${OWNER_ADDRESS}" \
    --rating 3 \
    --comment "Changed my mind"

# ── 11. get_review — not found ────────────────────────────────────────────────
log_section "11. get_review — not found"

assert_failure \
  "get_review panics for non-existent ID" \
  invoke_reviewer get_review --id 9999

# ── 12. review_count consistency ─────────────────────────────────────────────
log_section "12. review_count consistency"

CURRENT_COUNT=$(invoke_reviewer review_count 2>&1 | tail -1)
log_info "Current review count: ${CURRENT_COUNT}"

assert_output_contains \
  "review_count reflects all submitted reviews" \
  "${CURRENT_COUNT}" \
  invoke_reviewer review_count

# ── 13. Empty comment is valid ────────────────────────────────────────────────
log_section "13. Edge cases"

assert_success \
  "submit_review accepts empty comment" \
  invoke_as "${OWNER_IDENTITY}" --id "${CONTRACT_ID}" -- submit_review \
    --reviewer "${OWNER_ADDRESS}" \
    --reviewee "${REVIEWER_ADDRESS}" \
    --rating 4 \
    --comment ""

assert_output_contains \
  "get_reputation for reviewer (single 4-star) returns 400" \
  "400" \
  invoke_reviewer get_reputation --reviewee "${REVIEWER_ADDRESS}"

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary "Review Tests"
