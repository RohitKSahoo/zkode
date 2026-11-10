// @ts-ignore
import * as snarkjs from "snarkjs";

self.onmessage = async (e: MessageEvent) => {
  const { witness } = e.data;
  try {
    const startTime = performance.now();
    const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(
      witness,
      "/zk/circuit.wasm",
      "/zk/circuit_final.zkey"
    );
    const computeTimeMs = Math.round(performance.now() - startTime);

    self.postMessage({
      success: true,
      payload: { proof, publicSignals, computeTimeMs },
    });
  } catch (err: any) {
    self.postMessage({
      success: false,
      error: err.message || "Failed to generate Groth16 proof in WebAssembly.",
    });
  }
};
