---
name: zk-circom
description: Strict guidelines for generating Circom 2.1+, SnarkJS, and WebAssembly ZK pipelines.
---

# CIRCOM & SNARKJS IMPLEMENTATION RULES

1. R1CS Quadratic Constraint Law:
   - In Circom, every constraint MUST be of the form A * B + C = 0.
   - NEVER write triple multiplications like `out <== a * b * c;`.
   - ALWAYS split into intermediate signals:
     ```javascript
     signal temp;
     temp <== a * b;
     out <== temp * c;
     ```

2. Powers of Tau Dimensioning:
   - Circom circuits containing BabyJubJub EdDSA (`EdDSAPoseidonVerifier`) generate > 4,500 constraints.
   - ALWAYS use `pot14` (capacity: 16,384 constraints). `pot12` (4,096) will crash the compiler.

3. Field Arithmetic Consistency:
   - The BN254 scalar field prime is:
     `21888242871839275222246405745257275088548364400416034343698204186575808495617`
   - NEVER use raw Node `crypto.createHash('sha256')` to mock proofs.
   - ALWAYS use `circomlibjs.buildPoseidon()` or `circomlibjs.buildEddsa()`.

4. Next.js App Router Webpack Shims:
   - SnarkJS references Node.js internals (`fs`, `readline`).
   - In `next.config.mjs`, always include:
     ```javascript
     webpack: (config, { isServer }) => {
       if (!isServer) {
         config.resolve.fallback = { fs: false, readline: false, path: false };
       }
       return config;
     }
     ```
   - Only call SnarkJS inside client Web Workers or `"use client"` modules.

