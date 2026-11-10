# Automated Circom & SnarkJS build script for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==> [1/5] Cleaning and creating build directories..."
$buildDir = Join-Path $PSScriptRoot "build"
if (Test-Path $buildDir) {
    Remove-Item -Recurse -Force (Join-Path $buildDir "*") -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
}

Write-Host "==> [2/5] Compiling Circom circuit to R1CS and WASM..."
& ".\circom.exe" universal_eligibility_v2.circom --r1cs --wasm --sym -o build/

Write-Host "==> [3/5] Initializing Powers of Tau (pot14 - 16,384 constraints max)..."
npx snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
npx snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau --name="zkode-ceremony" -v -e="zkode_entropy_seed_november_2026"
npx snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v

Write-Host "==> [4/5] Executing Groth16 circuit setup and generating proving key..."
npx snarkjs groth16 setup build/universal_eligibility_v2.r1cs build/pot14_final.ptau build/circuit_final.zkey
npx snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

Write-Host "==> [5/5] Deploying build artifacts to Next.js public directory and FastAPI core..."
$frontendZk = Join-Path $PSScriptRoot "..\frontend\public\zk"
New-Item -ItemType Directory -Force -Path $frontendZk | Out-Null
Copy-Item -Force "build\universal_eligibility_v2_js\universal_eligibility_v2.wasm" (Join-Path $frontendZk "circuit.wasm")
Copy-Item -Force "build\circuit_final.zkey" (Join-Path $frontendZk "circuit_final.zkey")
Copy-Item -Force "build\verification_key.json" (Join-Path $frontendZk "verification_key.json")

$backendCore = Join-Path $PSScriptRoot "..\backend\app\core"
Copy-Item -Force "build\verification_key.json" (Join-Path $backendCore "verification_key.json")

Write-Host "==> Build and deployment complete!"
