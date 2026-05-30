#!/usr/bin/env bash
# =============================================================================
# utils/network-config.sh
# Shared network configuration for Rentars CLI test suite.
# Sourced by all test scripts — do not execute directly.
# =============================================================================

# ── Network ───────────────────────────────────────────────────────────────────
export STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
export STELLAR_RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
export STELLAR_NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
export FRIENDBOT_URL="https://friendbot.stellar.org"

# ── CLI binary ────────────────────────────────────────────────────────────────
# Prefer the locally installed stellar CLI; fall back to PATH.
STELLAR_CLI="${STELLAR_CLI:-stellar}"

# ── Contract WASM paths (relative to repo root) ───────────────────────────────
CONTRACTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/apps/contracts"
WASM_DIR="${CONTRACTS_DIR}/target/wasm32-unknown-unknown/release"

PROPERTY_LISTING_WASM="${WASM_DIR}/property_listing.wasm"
BOOKING_WASM="${WASM_DIR}/booking.wasm"
REVIEW_CONTRACT_WASM="${WASM_DIR}/review_contract.wasm"

# ── Identity names (created by setup.sh) ─────────────────────────────────────
ADMIN_IDENTITY="rentars-admin"
OWNER_IDENTITY="rentars-owner"
TENANT_IDENTITY="rentars-tenant"
REVIEWER_IDENTITY="rentars-reviewer"

# ── Shared state file (populated by setup.sh, read by test scripts) ───────────
STATE_FILE="$(dirname "${BASH_SOURCE[0]}")/../.test-state.env"

# ── Helper: load persisted contract addresses ─────────────────────────────────
load_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck source=/dev/null
    source "${STATE_FILE}"
  else
    echo "[network-config] WARNING: state file not found at ${STATE_FILE}" >&2
    echo "[network-config] Run setup.sh first." >&2
  fi
}

# ── Helper: persist a key=value pair to the state file ───────────────────────
save_state() {
  local key="$1"
  local value="$2"
  # Remove any existing line for this key, then append the new value.
  if [[ -f "${STATE_FILE}" ]]; then
    grep -v "^${key}=" "${STATE_FILE}" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "${STATE_FILE}"
  fi
  echo "${key}=${value}" >> "${STATE_FILE}"
}
