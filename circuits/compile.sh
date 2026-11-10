#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/5] Cleaning and creating build directories..."
mkdir -p build
rm -rf build/*

echo "==> [2/5] Compiling Circom circuit to R1CS and WASM..."
circom universal_eligibility_v2.circom --r1cs --wasm --sym -o build/

echo "==> [3/5] Initializing Powers of Tau (pot14 - 16,384 constraints max)..."
npx snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
npx snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau \
  --name="zkode-ceremony" -v -e="zkode_entropy_seed_november_2026"
npx snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v

echo "==> [4/5] Executing Groth16 circuit setup and generating proving key..."
npx snarkjs groth16 setup build/universal_eligibility_v2.r1cs build/pot14_final.ptau build/circuit_final.zkey
npx snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

echo "==> [5/5] Deploying build artifacts to Next.js public directory and FastAPI core..."
mkdir -p ../frontend/public/zk/
cp build/universal_eligibility_v2_js/universal_eligibility_v2.wasm ../frontend/public/zk/circuit.wasm
cp build/circuit_final.zkey ../frontend/public/zk/circuit_final.zkey
cp build/verification_key.json ../frontend/public/zk/verification_key.json

mkdir -p ../backend/app/core/
cp build/verification_key.json ../backend/app/core/verification_key.json

echo "==> Build complete."
