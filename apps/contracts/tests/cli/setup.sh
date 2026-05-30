#!/usr/bin/env bash
# =============================================================================
# setup.sh
# Fund test accounts, configure the Stellar testnet network, and deploy all
# three Rentars contracts.  Run this once before executing any test scripts.
#
# Usage:
#   ./setup.sh [--skip-build] [--skip-fund]
#
# Options:
#   --skip-build   Skip cargo build (use existing WASM artefacts)
#   --skip-fund    Skip friendbot funding (accounts already funded)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=utils/network-config.sh
source "${SCRIPT_DIR}/utils/network-config.sh"
# shellcheck source=utils/test-helpers.sh
source "${SCRIPT_DIR}/utils/test-helpers.sh"

# ── Parse flags ───────────────────────────────────────────────────────────────
SKIP_BUILD=false
SKIP_FUND=false
for arg in "$@"; do
  case "${arg}" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-fund)  SKIP_FUND=true  ;;
  esac
done

# ── Verify stellar CLI is available ───────────────────────────────────────────
if ! command -v "${STELLAR_CLI}" &>/dev/null; then
  log_error "stellar CLI not found. Install it from:"
  log_error "  https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli"
  exit 1
fi

log_section "Rentars Contract Test Setup"
log_info "Network:  ${STELLAR_NETWORK}"
log_info "RPC URL:  ${STELLAR_RPC_URL}"

# ── Step 1: Configure network ─────────────────────────────────────────────────
log_section "Step 1: Configure Network"

if "${STELLAR_CLI}" network ls 2>/dev/null | grep -q "^${STELLAR_NETWORK}$"; then
  log_info "Network '${STELLAR_NETWORK}' already configured — skipping."
else
  log_info "Adding network '${STELLAR_NETWORK}'..."
  "${STELLAR_CLI}" network add \
    --rpc-url "${STELLAR_RPC_URL}" \
    --network-passphrase "${STELLAR_NETWORK_PASSPHRASE}" \
    "${STELLAR_NETWORK}"
  log_success "Network '${STELLAR_NETWORK}' configured."
fi

# ── Step 2: Create test identities ────────────────────────────────────────────
log_section "Step 2: Create Test Identities"

create_identity_if_missing() {
  local name="$1"
  if "${STELLAR_CLI}" keys ls 2>/dev/null | grep -q "^${name}$"; then
    log_info "Identity '${name}' already exists — skipping."
  else
    log_info "Generating identity '${name}'..."
    "${STELLAR_CLI}" keys generate --no-fund "${name}"
    log_success "Identity '${name}' created."
  fi
}

create_identity_if_missing "${ADMIN_IDENTITY}"
create_identity_if_missing "${OWNER_IDENTITY}"
create_identity_if_missing "${TENANT_IDENTITY}"
create_identity_if_missing "${REVIEWER_IDENTITY}"

# ── Step 3: Fund accounts via Friendbot ───────────────────────────────────────
log_section "Step 3: Fund Test Accounts"

fund_account() {
  local name="$1"
  local address
  address=$("${STELLAR_CLI}" keys address "${name}")
  log_info "Funding '${name}' (${address})..."
  curl -s "${FRIENDBOT_URL}?addr=${address}" > /dev/null
  log_success "Funded '${name}'."
}

if [[ "${SKIP_FUND}" == "false" ]]; then
  fund_account "${ADMIN_IDENTITY}"
  fund_account "${OWNER_IDENTITY}"
  fund_account "${TENANT_IDENTITY}"
  fund_account "${REVIEWER_IDENTITY}"
  # Brief pause to let Friendbot transactions settle
  log_info "Waiting for Friendbot transactions to settle..."
  sleep 8
else
  log_warn "Skipping account funding (--skip-fund)."
fi

# ── Step 4: Build contracts ───────────────────────────────────────────────────
log_section "Step 4: Build Contracts"

if [[ "${SKIP_BUILD}" == "false" ]]; then
  log_info "Building contracts (cargo build --target wasm32-unknown-unknown --release)..."
  (
    cd "${CONTRACTS_DIR}"
    cargo build --target wasm32-unknown-unknown --release 2>&1
  )
  log_success "Contracts built."
else
  log_warn "Skipping build (--skip-build)."
fi

# Verify WASM artefacts exist
for wasm in "${PROPERTY_LISTING_WASM}" "${BOOKING_WASM}" "${REVIEW_CONTRACT_WASM}"; do
  if [[ ! -f "${wasm}" ]]; then
    log_error "WASM not found: ${wasm}"
    log_error "Run without --skip-build, or build manually."
    exit 1
  fi
done
log_success "All WASM artefacts present."

# ── Step 5: Deploy contracts ──────────────────────────────────────────────────
log_section "Step 5: Deploy Contracts"

deploy_contract() {
  local name="$1"
  local wasm="$2"
  log_info "Deploying ${name}..."
  local contract_id
  contract_id=$(
    "${STELLAR_CLI}" contract deploy \
      --wasm "${wasm}" \
      --source "${ADMIN_IDENTITY}" \
      --network "${STELLAR_NETWORK}" \
      2>&1 | tail -1
  )
  echo "${contract_id}"
}

PROPERTY_LISTING_CONTRACT_ID=$(deploy_contract "property-listing" "${PROPERTY_LISTING_WASM}")
log_success "property-listing deployed: ${PROPERTY_LISTING_CONTRACT_ID}"

BOOKING_CONTRACT_ID=$(deploy_contract "booking" "${BOOKING_WASM}")
log_success "booking deployed: ${BOOKING_CONTRACT_ID}"

REVIEW_CONTRACT_ID=$(deploy_contract "review-contract" "${REVIEW_CONTRACT_WASM}")
log_success "review-contract deployed: ${REVIEW_CONTRACT_ID}"

# ── Step 6: Initialize booking contract ───────────────────────────────────────
log_section "Step 6: Initialize Booking Contract"

ADMIN_ADDRESS=$("${STELLAR_CLI}" keys address "${ADMIN_IDENTITY}")
log_info "Initializing booking contract with admin ${ADMIN_ADDRESS}..."

"${STELLAR_CLI}" contract invoke \
  --id "${BOOKING_CONTRACT_ID}" \
  --source "${ADMIN_IDENTITY}" \
  --network "${STELLAR_NETWORK}" \
  -- initialize \
  --admin "${ADMIN_ADDRESS}"

log_success "Booking contract initialized."

# ── Step 7: Persist state ─────────────────────────────────────────────────────
log_section "Step 7: Persist State"

# Clear and recreate the state file
rm -f "${STATE_FILE}"
touch "${STATE_FILE}"

save_state "PROPERTY_LISTING_CONTRACT_ID" "${PROPERTY_LISTING_CONTRACT_ID}"
save_state "BOOKING_CONTRACT_ID"          "${BOOKING_CONTRACT_ID}"
save_state "REVIEW_CONTRACT_ID"           "${REVIEW_CONTRACT_ID}"
save_state "ADMIN_ADDRESS"                "${ADMIN_ADDRESS}"
save_state "OWNER_ADDRESS"                "$("${STELLAR_CLI}" keys address "${OWNER_IDENTITY}")"
save_state "TENANT_ADDRESS"               "$("${STELLAR_CLI}" keys address "${TENANT_IDENTITY}")"
save_state "REVIEWER_ADDRESS"             "$("${STELLAR_CLI}" keys address "${REVIEWER_IDENTITY}")"

log_success "State saved to ${STATE_FILE}"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Setup complete.${RESET}"
echo ""
echo "  Property Listing Contract : ${PROPERTY_LISTING_CONTRACT_ID}"
echo "  Booking Contract          : ${BOOKING_CONTRACT_ID}"
echo "  Review Contract           : ${REVIEW_CONTRACT_ID}"
echo ""
echo "Run the tests:"
echo "  ./run-all-tests.sh"
echo "  ./test-property-listing.sh"
echo "  ./test-booking.sh"
echo "  ./test-review.sh"
