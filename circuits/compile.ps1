$ErrorActionPreference = "Stop"

Write-Host "==> [1/4] Compiling Circom circuit..."
if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" | Out-Null
}
.\circom.exe universal_eligibility_v2.circom -l node_modules --r1cs --wasm --sym -o build/

Write-Host "==> [2/4] Setting up Powers of Tau (pot14 - 16,384 constraints max)..."
npx snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
npx snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau --name="zkode-ceremony" -v -e="zkode_entropy_seed_november_2026"
npx snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v

Write-Host "==> [3/4] Running Groth16 circuit setup..."
npx snarkjs groth16 setup build/universal_eligibility_v2.r1cs build/pot14_final.ptau build/circuit_final.zkey
npx snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

Write-Host "==> [4/4] Deploying artifacts to frontend and backend..."
New-Item -ItemType Directory -Force -Path "../frontend/public/zk" | Out-Null
Copy-Item "build/universal_eligibility_v2_js/universal_eligibility_v2.wasm" "../frontend/public/zk/circuit.wasm" -Force
Copy-Item "build/circuit_final.zkey" "../frontend/public/zk/circuit_final.zkey" -Force
Copy-Item "build/verification_key.json" "../frontend/public/zk/verification_key.json" -Force

New-Item -ItemType Directory -Force -Path "../backend/app/core" | Out-Null
Copy-Item "build/verification_key.json" "../backend/app/core/verification_key.json" -Force

Write-Host "==> Groth16 setup and deployment complete!"

