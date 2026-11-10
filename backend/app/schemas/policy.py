from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

QUANTIZATION_BUCKET = 25000

class CompilePolicyRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="Natural language statutory rule or policy text",
        examples=["Scholarship applicant must be at least 18 years old, maintain bank balance >= ₹50,000, annual income <= ₹8,00,000, and academic score >= 8.2 CGPA."]
    )
    service_scope_id: str = Field(default="901", description="Unique campaign / service scope identifier")

class QuantizedPolicySchema(BaseModel):
    min_age: int = Field(default=0, ge=0, le=120, description="Minimum age requirement in years")
    min_balance: int = Field(default=0, ge=0, description="Minimum liquid bank balance requirement in INR")
    max_income: int = Field(default=999999999, ge=0, description="Maximum allowable annual household income in INR")
    min_cgpa_x100: int = Field(default=0, ge=0, le=1000, description="Academic CGPA / merit score scaled by 100 (e.g. 8.20 -> 820)")
    service_scope_id: str = Field(default="901", description="Service scope identifier")

    @field_validator("min_balance", "max_income")
    @classmethod
    def enforce_25k_quantization(cls, val: int) -> int:
        if val >= 999999999:
            return 999999999
        if val % QUANTIZATION_BUCKET != 0:
            return (val // QUANTIZATION_BUCKET) * QUANTIZATION_BUCKET
        return val

class CompiledPolicyResponse(BaseModel):
    success: bool = True
    policy_id: str
    serviceScopeId: str
    currentTimestamp: str
    maxBirthTimestamp: str
    minBalanceRequired: str
    maxIncomeAllowed: str
    minScoreRequired: str
    symbolicReceipt: List[str]

