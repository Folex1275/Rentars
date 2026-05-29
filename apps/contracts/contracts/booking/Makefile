# Makefile for the booking Soroban contract
# Targets: build, test, test-cross-contract, deploy-testnet, clean

CONTRACT_NAME  := booking
WASM_TARGET    := wasm32-unknown-unknown
WASM_OUT       := ../../target/wasm32-unknown-unknown/release/$(CONTRACT_NAME).wasm
LISTING_WASM   := ../../target/wasm32-unknown-unknown/release/property_listing.wasm

# Stellar CLI testnet config
NETWORK        := testnet
NETWORK_RPC    := https://soroban-testnet.stellar.org
NETWORK_PASS   := Test SDF Network ; September 2015
SOURCE_ACCOUNT := default

.PHONY: build test test-cross-contract deploy-testnet clean

## Build the contract to WASM (release)
build:
	cargo build --target $(WASM_TARGET) --release

## Run all unit tests (native target, includes cross-contract interaction tests)
test:
	cargo test

## ─── Cross-Contract CLI Test Suite ──────────────────────────────────────────
##
## Tests the full cross-contract flow on Stellar testnet using the Stellar CLI.
##
## Prerequisites:
##   1. Both contracts must be deployed (run `make deploy-testnet` in each
##      contract directory first).
##   2. Set LISTING_CONTRACT_ID and BOOKING_CONTRACT_ID to the deployed addresses.
##   3. Set OWNER_ACCOUNT and TENANT_ACCOUNT to funded testnet accounts.
##
## Usage:
##   make test-cross-contract \
##     LISTING_CONTRACT_ID=<address> \
##     BOOKING_CONTRACT_ID=<address> \
##     OWNER_ACCOUNT=<account> \
##     TENANT_ACCOUNT=<account>
##
## Flow tested:
##   Step 1 — Create a property listing (Active status)
##   Step 2 — Create a booking (booking contract verifies Active, marks Rented)
##   Step 3 — Verify property status is now Rented
##   Step 4 — Attempt a second booking on the same property (must fail)
## ─────────────────────────────────────────────────────────────────────────────
test-cross-contract:
	@echo "=== Step 1: Create property listing ==="
	stellar contract invoke \
		--id $(LISTING_CONTRACT_ID) \
		--source $(OWNER_ACCOUNT) \
		--network $(NETWORK) \
		-- create_listing \
		--owner $(OWNER_ACCOUNT) \
		--title "Cross-Contract Test Property" \
		--description "Used for CLI cross-contract test" \
		--price_per_night 1000000000

	@echo "=== Step 2: Initialize booking contract with listing contract address ==="
	stellar contract invoke \
		--id $(BOOKING_CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- initialize \
		--admin $(SOURCE_ACCOUNT) \
		--property_listing_contract_id $(LISTING_CONTRACT_ID)

	@echo "=== Step 3: Create booking (cross-contract: verifies Active, marks Rented) ==="
	stellar contract invoke \
		--id $(BOOKING_CONTRACT_ID) \
		--source $(TENANT_ACCOUNT) \
		--network $(NETWORK) \
		-- create_booking \
		--tenant $(TENANT_ACCOUNT) \
		--property_id 1 \
		--check_in 1700000000 \
		--check_out 1700604800 \
		--total_price 7000000000

	@echo "=== Step 4: Verify property is now Rented ==="
	stellar contract invoke \
		--id $(LISTING_CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- get_listing \
		--id 1

	@echo "=== Step 5: Attempt second booking on same property (must fail) ==="
	stellar contract invoke \
		--id $(BOOKING_CONTRACT_ID) \
		--source $(TENANT_ACCOUNT) \
		--network $(NETWORK) \
		-- create_booking \
		--tenant $(TENANT_ACCOUNT) \
		--property_id 1 \
		--check_in 1701000000 \
		--check_out 1701604800 \
		--total_price 7000000000 \
	&& echo "ERROR: Second booking should have failed" && exit 1 \
	|| echo "PASS: Second booking correctly rejected (property is Rented)"

## Deploy the compiled WASM to Stellar testnet
deploy-testnet: build
	stellar contract deploy \
		--wasm $(WASM_OUT) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		--network-passphrase "$(NETWORK_PASS)" \
		--rpc-url $(NETWORK_RPC)

## Remove build artefacts
clean:
	cargo clean
