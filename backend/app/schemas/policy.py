from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional

QUANTIZATION_BUCKET = 25000

class CompilePolicyRequest(BaseModel):
    prompt: str = Field(
        ..., 
        example="Applicant must be at least 18 years old, have balance >= ₹50,000, and annual income <= ₹8,00,000"
    )
    service_scope_id: str = Field(default="901", example="901")

class QuantizedPolicySchema(BaseModel):
    min_age: int = Field(default=0, ge=0, le=120)
    min_balance: int = Field(default=0, ge=0)
    max_income: int = Field(default=999999999, ge=0)
    min_cgpa_x100: int = Field(default=0, ge=0, le=1000)
    service_scope_id: str = Field(default="901")

    @field_validator("min_balance", "max_income")
    @classmethod
    def enforce_25k_buckets(cls, val: int) -> int:
        if val == 999999999:
            return val
        if val % QUANTIZATION_BUCKET != 0:
            return (val // QUANTIZATION_BUCKET) * QUANTIZATION_BUCKET
        return val

class CompiledPolicyResponse(BaseModel):
    success: bool
    policy_id: str
    serviceScopeId: str
    currentTimestamp: str
    maxBirthTimestamp: str
    minBalanceRequired: str
    maxIncomeAllowed: str
    minScoreRequired: str
    symbolicReceipt: List[str]

class ChallengeResponse(BaseModel):
    sessionId: str
    sessionNonce: str
    expiresAt: int
    ttlSeconds: int = 60

class Groth16Proof(BaseModel):
    pi_a: List[str]
    pi_b: List[List[str]]
    pi_c: List[str]
    protocol: str = "groth16"
    curve: str = "bn128"

class VerifyProofRequest(BaseModel):
    proof: Groth16Proof
    clientNullifier: str
    serviceScopeId: str = "901"
    sessionNonce: str

class VerifyProofResponse(BaseModel):
    verified: bool
    nullifierHash: Optional[str] = None
    serviceScopeId: Optional[str] = None
    message: str
    error: Optional[str] = None
    sybilBlocked: bool = False
    telemetry: Optional[Dict[str, Any]] = None

