#!/usr/bin/env bash
# =============================================================================
# utils/test-helpers.sh
# Shared test utilities for Rentars CLI test suite.
# Sourced by all test scripts — do not execute directly.
# =============================================================================

# ── Counters ──────────────────────────────────────────────────────────────────
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Logging helpers ───────────────────────────────────────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
log_success() { echo -e "${GREEN}[PASS]${RESET}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
log_error()   { echo -e "${RED}[FAIL]${RESET}  $*"; }
log_section() { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

# ── assert_success ────────────────────────────────────────────────────────────
# Usage: assert_success <test_name> <command...>
# Runs <command>, passes if exit code is 0.
assert_success() {
  local test_name="$1"
  shift
  TESTS_RUN=$((TESTS_RUN + 1))

  local output
  output=$("$@" 2>&1)
  local exit_code=$?

  if [[ ${exit_code} -eq 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "${test_name}"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("${test_name}")
    log_error "${test_name}"
    echo -e "  ${RED}Command:${RESET} $*"
    echo -e "  ${RED}Output:${RESET}\n${output}"
    return 1
  fi
}

# ── assert_failure ────────────────────────────────────────────────────────────
# Usage: assert_failure <test_name> <command...>
# Runs <command>, passes if exit code is non-zero (expected error).
assert_failure() {
  local test_name="$1"
  shift
  TESTS_RUN=$((TESTS_RUN + 1))

  local output
  output=$("$@" 2>&1)
  local exit_code=$?

  if [[ ${exit_code} -ne 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "${test_name} (expected failure)"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("${test_name}")
    log_error "${test_name} (expected failure but command succeeded)"
    echo -e "  ${RED}Command:${RESET} $*"
    echo -e "  ${RED}Output:${RESET}\n${output}"
    return 1
  fi
}

# ── assert_output_contains ────────────────────────────────────────────────────
# Usage: assert_output_contains <test_name> <expected_substring> <command...>
# Runs <command>, passes if stdout/stderr contains <expected_substring>.
assert_output_contains() {
  local test_name="$1"
  local expected="$2"
  shift 2
  TESTS_RUN=$((TESTS_RUN + 1))

  local output
  output=$("$@" 2>&1)
  local exit_code=$?

  if echo "${output}" | grep -q "${expected}"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "${test_name}"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("${test_name}")
    log_error "${test_name}"
    echo -e "  ${RED}Expected output to contain:${RESET} ${expected}"
    echo -e "  ${RED}Actual output:${RESET}\n${output}"
    return 1
  fi
}

# ── run_contract ──────────────────────────────────────────────────────────────
# Thin wrapper around `stellar contract invoke` that injects the shared
# network flags automatically.
# Usage: run_contract --id <contract_id> -- <fn_name> [args...]
run_contract() {
  "${STELLAR_CLI}" contract invoke \
    --network "${STELLAR_NETWORK}" \
    --source "${ADMIN_IDENTITY}" \
    "$@"
}

# ── invoke_as ─────────────────────────────────────────────────────────────────
# Like run_contract but lets the caller specify the signing identity.
# Usage: invoke_as <identity> --id <contract_id> -- <fn_name> [args...]
invoke_as() {
  local identity="$1"
  shift
  "${STELLAR_CLI}" contract invoke \
    --network "${STELLAR_NETWORK}" \
    --source "${identity}" \
    "$@"
}

# ── get_address ───────────────────────────────────────────────────────────────
# Return the Stellar address for a named identity.
get_address() {
  "${STELLAR_CLI}" keys address "$1"
}

# ── print_summary ─────────────────────────────────────────────────────────────
# Print a test-run summary and exit with code 1 if any tests failed.
print_summary() {
  local suite_name="${1:-Test Suite}"
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD} ${suite_name} — Results${RESET}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "  Total:   ${TESTS_RUN}"
  echo -e "  ${GREEN}Passed:  ${TESTS_PASSED}${RESET}"
  if [[ ${TESTS_FAILED} -gt 0 ]]; then
    echo -e "  ${RED}Failed:  ${TESTS_FAILED}${RESET}"
    echo ""
    echo -e "${RED}Failed tests:${RESET}"
    for t in "${FAILED_TESTS[@]}"; do
      echo -e "  ${RED}✗${RESET} ${t}"
    done
    echo ""
    exit 1
  else
    echo -e "  ${GREEN}All tests passed.${RESET}"
    echo ""
    exit 0
  fi
}

# ── require_env ───────────────────────────────────────────────────────────────
# Abort with a helpful message if a required env variable is unset.
require_env() {
  local var="$1"
  if [[ -z "${!var}" ]]; then
    log_error "Required environment variable '${var}' is not set."
    log_error "Run setup.sh first, or export the variable manually."
    exit 1
  fi
}

# ── wait_for_ledger ───────────────────────────────────────────────────────────
# Sleep briefly to allow the testnet to advance a ledger (useful between
# dependent transactions).
wait_for_ledger() {
  sleep "${1:-6}"
}
