# Makefile for the booking Soroban contract
# Targets: build, test, deploy-testnet, clean

CONTRACT_NAME  := booking
WASM_TARGET    := wasm32-unknown-unknown
WASM_OUT       := ../../target/wasm32-unknown-unknown/release/$(CONTRACT_NAME).wasm

# Stellar CLI testnet config
NETWORK        := testnet
NETWORK_RPC    := https://soroban-testnet.stellar.org
NETWORK_PASS   := Test SDF Network ; September 2015
SOURCE_ACCOUNT := default

.PHONY: build test deploy-testnet clean

## Build the contract to WASM (release)
build:
	cargo build --target $(WASM_TARGET) --release

## Run all unit tests (native target)
test:
	cargo test

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
