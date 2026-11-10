declare module "snarkjs" {
  export const groth16: any;
  export const powersOfTau: any;
  export const r1cs: any;
  export const zKey: any;
  export const wtns: any;
}

declare module "circomlibjs" {
  export function buildEddsa(): Promise<any>;
  export function buildPoseidon(): Promise<any>;
  export function buildBabyjub(): Promise<any>;
}

