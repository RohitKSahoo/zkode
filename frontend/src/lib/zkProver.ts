import { validatePolicyEntropy } from "./entropyGuard";

export interface ZkProofResult {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
  computeTimeMs: number;
}

export async function executeZkProof(
  witness: Record<string, string>,
  policy: Record<string, string>
): Promise<ZkProofResult> {
  // 1. Client-Side Entropy Guard: enforce ₹25k steps & anti-probing
  validatePolicyEntropy(policy);

  // 2. Prover execution via snarkjs
  // Try Web Worker first for non-blocking UI thread
  if (typeof window !== "undefined" && window.Worker) {
    try {
      return await new Promise<ZkProofResult>((resolve, reject) => {
        const worker = new Worker(
          new URL("../../public/workers/zkProver.worker.ts", import.meta.url)
        );

        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("Proof generation timed out after 30 seconds."));
        }, 30000);

        worker.postMessage({ witness });

        worker.onmessage = (event: MessageEvent) => {
          clearTimeout(timeout);
          worker.terminate();
          const { success, payload, error } = event.data;
          if (success) {
            resolve(payload);
          } else {
            reject(new Error(error || "WASM Proof generation failed."));
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error("Worker thread failed: " + err.message));
        };
      });
    } catch (workerErr: any) {
      console.warn("Worker execution fallback to main thread:", workerErr);
    }
  }

  // Fallback direct execution if Worker unavailable
  const snarkjs = await import("snarkjs");
  const startTime = performance.now();
  const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(
    witness,
    "/zk/circuit.wasm",
    "/zk/circuit_final.zkey"
  );
  const computeTimeMs = Math.round(performance.now() - startTime);

  return {
    proof,
    publicSignals,
    computeTimeMs,
  };
}

