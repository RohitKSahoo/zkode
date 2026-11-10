from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Groth16Proof(BaseModel):
    pi_a: List[str] = Field(..., description="[X, Y, 1] projective point coordinates on G1")
    pi_b: List[List[str]] = Field(..., description="[[X0, X1], [Y0, Y1], [1, 0]] point coordinates on G2")
    pi_c: List[str] = Field(..., description="[X, Y, 1] projective point coordinates on G1")
    protocol: str = Field(default="groth16")
    curve: str = Field(default="bn128")

class VerifyProofRequest(BaseModel):
    proof: Groth16Proof = Field(..., description="Groth16 zk-SNARK proof object")
    clientNullifier: str = Field(..., description="Client-computed Poseidon nullifier hash (output signal 2)")
    serviceScopeId: str = Field(default="901", description="Service scope identifier")
    sessionNonce: str = Field(..., description="Ephemeral session nonce used in proof generation")

class VerifyProofResponse(BaseModel):
    verified: bool
    nullifierHash: Optional[str] = None
    serviceScopeId: Optional[str] = None
    message: str
    error: Optional[str] = None
    sybilBlocked: bool = False
    telemetry: Dict[str, Any] = Field(default_factory=dict)
