#!/usr/bin/env bash
# =============================================================================
# run-all-tests.sh
# Execute all Rentars CLI contract test scripts sequentially.
#
# Usage:
#   ./run-all-tests.sh [--skip-setup] [--skip-build] [--skip-fund]
#
# Options:
#   --skip-setup   Skip running setup.sh (use existing deployed contracts)
#   --skip-build   Passed through to setup.sh — skip cargo build
#   --skip-fund    Passed through to setup.sh — skip Friendbot funding
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=utils/network-config.sh
source "${SCRIPT_DIR}/utils/network-config.sh"
# shellcheck source=utils/test-helpers.sh
source "${SCRIPT_DIR}/utils/test-helpers.sh"

# ── Parse flags ───────────────────────────────────────────────────────────────
SKIP_SETUP=false
SETUP_FLAGS=()
for arg in "$@"; do
  case "${arg}" in
    --skip-setup) SKIP_SETUP=true ;;
    --skip-build) SETUP_FLAGS+=("--skip-build") ;;
    --skip-fund)  SETUP_FLAGS+=("--skip-fund")  ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║        Rentars Contract CLI Test Suite               ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Network : ${STELLAR_NETWORK}"
echo -e "  RPC URL : ${STELLAR_RPC_URL}"
echo ""

# ── Track overall results ─────────────────────────────────────────────────────
SUITE_RESULTS=()
SUITE_EXIT_CODES=()

run_suite() {
  local name="$1"
  local script="$2"
  echo ""
  echo -e "${BOLD}${BLUE}▶ Running: ${name}${RESET}"
  echo -e "${BLUE}  Script: ${script}${RESET}"
  echo ""

  if bash "${script}"; then
    SUITE_RESULTS+=("${GREEN}✓ PASSED${RESET}  ${name}")
    SUITE_EXIT_CODES+=(0)
  else
    SUITE_RESULTS+=("${RED}✗ FAILED${RESET}  ${name}")
    SUITE_EXIT_CODES+=(1)
  fi
}

# ── Step 1: Setup ─────────────────────────────────────────────────────────────
if [[ "${SKIP_SETUP}" == "false" ]]; then
  echo -e "${BOLD}${BLUE}▶ Running: Setup${RESET}"
  bash "${SCRIPT_DIR}/setup.sh" "${SETUP_FLAGS[@]}"
else
  log_warn "Skipping setup (--skip-setup). Using existing deployed contracts."
  load_state
fi

# ── Step 2: Run test suites ───────────────────────────────────────────────────
run_suite "Property Listing Tests" "${SCRIPT_DIR}/test-property-listing.sh"
run_suite "Booking Tests"          "${SCRIPT_DIR}/test-booking.sh"
run_suite "Review Tests"           "${SCRIPT_DIR}/test-review.sh"

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║              Overall Test Results                    ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

OVERALL_FAILED=0
for i in "${!SUITE_RESULTS[@]}"; do
  echo -e "  ${SUITE_RESULTS[$i]}"
  if [[ "${SUITE_EXIT_CODES[$i]}" -ne 0 ]]; then
    OVERALL_FAILED=$((OVERALL_FAILED + 1))
  fi
done

echo ""
if [[ "${OVERALL_FAILED}" -eq 0 ]]; then
  echo -e "${BOLD}${GREEN}All test suites passed.${RESET}"
  echo ""
  exit 0
else
  echo -e "${BOLD}${RED}${OVERALL_FAILED} test suite(s) failed.${RESET}"
  echo ""
  exit 1
fi
